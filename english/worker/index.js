const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

async function hashUserId(nickname, pin) {
  const text = `${nickname.toLowerCase().trim()}:${pin}`
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 24)
}

function today() {
  return new Date().toISOString().split('T')[0]
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS })
    }

    const url = new URL(request.url)

    // Redirect non-API requests to the new site
    if (!url.pathname.startsWith('/api/')) {
      const newUrl = 'http://111.230.115.114'
      const html = `<!DOCTYPE html><html><head><meta http-equiv="refresh" content="0;url=${newUrl}"><meta charset="UTF-8"></head><body style="text-align:center;padding:40px;font-family:sans-serif"><p>本网站已迁移至 <a href="${newUrl}">${newUrl}</a></p><p>正在跳转…</p></body></html>`
      return new Response(html, {
        status: 200,
        headers: { 'Content-Type': 'text/html;charset=UTF-8', 'Cache-Control': 'no-store, no-cache, must-revalidate', ...CORS }
      })
    }

    const parts = url.pathname.split('/').filter(Boolean) // ['api', 'auth'] etc.

    try {
      // POST /api/auth
      if (parts[0] === 'api' && parts[1] === 'auth' && request.method === 'POST') {
        const { nickname, pin } = await request.json()
        if (!nickname || !pin) return json({ error: 'Missing nickname or pin' }, 400)

        const userId = await hashUserId(nickname, pin)
        const trimmedName = nickname.trim()
        const existing = await env.DB.prepare(
          'SELECT user_id FROM user_meta WHERE user_id = ?'
        ).bind(userId).first()

        if (!existing) {
          // Check nickname uniqueness
          const nameTaken = await env.DB.prepare(
            'SELECT user_id FROM user_meta WHERE LOWER(nickname) = LOWER(?)'
          ).bind(trimmedName).first()
          if (nameTaken) return json({ error: '这个名字已经被使用了，请换一个' }, 409)

          await env.DB.prepare(
            'INSERT INTO user_meta (user_id, nickname, created_at) VALUES (?, ?, ?)'
          ).bind(userId, trimmedName, today()).run()
        }

        return json({ userId, nickname: trimmedName })
      }

      // GET /api/progress/:userId
      if (parts[0] === 'api' && parts[1] === 'progress' && parts[2] && request.method === 'GET') {
        const userId = parts[2]
        const meta = await env.DB.prepare(
          'SELECT * FROM user_meta WHERE user_id = ?'
        ).bind(userId).first()

        const rows = await env.DB.prepare(
          'SELECT * FROM progress WHERE user_id = ?'
        ).bind(userId).all()

        const progress = {}
        for (const row of rows.results) {
          progress[row.word_id] = {
            box: row.box,
            nextReview: row.next_review,
            correct: row.correct,
            wrong: row.wrong,
            learnedAt: row.learned_at,
            lastSeen: row.last_seen,
          }
        }

        return json({
          progress,
          totalStars: meta?.total_stars ?? 0,
          streak: meta?.streak ?? 0,
          lastActive: meta?.last_active ?? null,
        })
      }

      // POST /api/progress/:userId
      if (parts[0] === 'api' && parts[1] === 'progress' && parts[2] && request.method === 'POST') {
        const userId = parts[2]
        const { progress, totalStars, streak } = await request.json()

        const todayStr = today()
        const stmts = []

        for (const [wordId, p] of Object.entries(progress)) {
          stmts.push(
            env.DB.prepare(
              `INSERT INTO progress (user_id, word_id, box, next_review, correct, wrong, learned_at, last_seen)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)
               ON CONFLICT(user_id, word_id) DO UPDATE SET
                 box = excluded.box,
                 next_review = excluded.next_review,
                 correct = excluded.correct,
                 wrong = excluded.wrong,
                 last_seen = excluded.last_seen`
            ).bind(userId, wordId, p.box, p.nextReview, p.correct, p.wrong, p.learnedAt, p.lastSeen)
          )
        }

        stmts.push(
          env.DB.prepare(
            `UPDATE user_meta SET total_stars = ?, streak = ?, last_active = ? WHERE user_id = ?`
          ).bind(totalStars, streak, todayStr, userId)
        )

        if (stmts.length > 0) {
          await env.DB.batch(stmts)
        }

        return json({ ok: true })
      }

      // GET /api/tts?text=hello
      if (parts[0] === 'api' && parts[1] === 'tts' && request.method === 'GET') {
        const text = url.searchParams.get('text')
        if (!text || text.length > 200) return json({ error: 'Bad text' }, 400)
        const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=en&q=${encodeURIComponent(text)}`
        const ttsRes = await fetch(ttsUrl)
        if (!ttsRes.ok) return json({ error: 'TTS failed' }, 502)
        return new Response(ttsRes.body, {
          headers: { ...CORS, 'Content-Type': 'audio/mpeg', 'Cache-Control': 'public, max-age=86400' },
        })
      }

      // GET /api/leaderboard
      if (parts[0] === 'api' && parts[1] === 'leaderboard' && request.method === 'GET') {
        const { results: topStars } = await env.DB.prepare(
          'SELECT nickname, total_stars, streak FROM user_meta ORDER BY total_stars DESC LIMIT 3'
        ).all()
        const { results: topStreak } = await env.DB.prepare(
          'SELECT nickname, total_stars, streak FROM user_meta ORDER BY streak DESC LIMIT 3'
        ).all()
        return json({ topStars: topStars || [], topStreak: topStreak || [] })
      }

      return json({ error: 'Not found' }, 404)
    } catch (e) {
      return json({ error: e.message }, 500)
    }
  },
}

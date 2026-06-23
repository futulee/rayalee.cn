import { api } from '../api.js?v=31';
import { navigate } from '../router.js?v=31';
import { setPageTitle } from '../share.js?v=31';

export async function render(main) {
  setPageTitle('Raya 篮球生活');
  document.getElementById('breadcrumb-trail').innerHTML = '<span class="current">篮球生活</span> <a href="#/admin" style="font-size:.7rem;color:rgba(255,255,255,.4);text-decoration:none;margin-left:6px" title="球队管理">⚙</a>';

  main.innerHTML = '<div id="dashboard"></div><div id="home-games"></div><div id="honors-section"></div>';
  await loadDashboard();
  await loadRecentGames();
  await loadHonors();
}

async function loadHonors() {
  const el = document.getElementById('honors-section');
  try {
    const honors = await api.getHonors();
    if (honors.length === 0) { el.innerHTML = ''; return; }
    el.innerHTML = `
      <div class="card" style="padding:12px 14px;margin-top:8px">
        <div style="font-weight:700;font-size:.85rem;color:var(--text-muted);margin-bottom:8px">🏆 球队荣誉</div>
        ${honors.map(h => `<div style="padding:4px 0;border-bottom:1px solid #f3f4f6;font-size:.85rem">🏅 ${h(h.content)}</div>`).join('')}
      </div>`;
  } catch (e) { el.innerHTML = ''; }
}

async function loadDashboard() {
  const el = document.getElementById('dashboard');
  try {
    const d = await api.getDashboard();
    if (!d.record || d.record.total === 0) { el.innerHTML = ''; return; }

    const r = d.record;
    const winRate = r.total > 0 ? ((r.wins / r.total) * 100).toFixed(1) : 0;

    const topRow = (data, label, unit) => data.map((p, i) =>
      `<div style="font-size:.8rem;line-height:1.8"><span style="color:#9ca3af">${i+1}.</span> ${h(p.name)} <span style="color:var(--primary);font-weight:700">${p.total}${unit}</span></div>`
    ).join('');

    el.innerHTML = `
      <div class="card" style="padding:12px 14px">
        <div style="text-align:center;margin-bottom:12px">
          <span style="font-weight:700;font-size:1rem;color:var(--text-muted);letter-spacing:1px">⭐ 深圳湾女篮 · 球队数据 ⭐</span>
        </div>
        <div style="display:flex;gap:12px;align-items:center;margin-bottom:12px">
          <canvas id="pie-chart" width="90" height="90" style="flex-shrink:0"></canvas>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px 20px;font-size:.9rem;line-height:1.8">
            <div>总场次 <b style="font-size:1.05rem">${r.total}</b></div>
            <div>胜率 <b style="color:#ef4444;font-size:1.05rem">${winRate}%</b></div>
            <div>胜利 <b style="color:#ef4444;font-size:1.05rem">${r.wins}</b></div>
            <div>失利 <b style="color:#22c55e;font-size:1.05rem">${r.losses}</b></div>
          </div>
        </div>
        <div style="display:flex;gap:6px">
          <div style="flex:1;background:#f0fdf4;border-radius:8px;padding:8px">
            <div style="font-size:.7rem;color:#16a34a;font-weight:700;margin-bottom:4px">得分 TOP3</div>
            ${topRow(d.topPoints, '得分', '分')}
          </div>
          <div style="flex:1;background:#eff6ff;border-radius:8px;padding:8px">
            <div style="font-size:.7rem;color:#2563eb;font-weight:700;margin-bottom:4px">抢断 TOP3</div>
            ${topRow(d.topSteals, '抢断', '次')}
          </div>
          <div style="flex:1;background:#fefce8;border-radius:8px;padding:8px">
            <div style="font-size:.7rem;color:#ca8a04;font-weight:700;margin-bottom:4px">篮板 TOP3</div>
            ${topRow(d.topRebounds, '篮板', '个')}
          </div>
        </div>
      </div>`;

    setTimeout(() => {
      const c = document.getElementById('pie-chart');
      if (!c) return;
      const ctx = c.getContext('2d');
      const cx = 45, cy = 45, outerR = 38, innerR = 26;
      const total = r.wins + r.losses || 1;
      const startAngle = -Math.PI / 2;
      const winArc = (r.wins / total) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(cx, cy, outerR, 0, Math.PI * 2);
      ctx.arc(cx, cy, innerR, Math.PI * 2, 0, true);
      ctx.fillStyle = '#22c55e';
      ctx.fill();
      if (r.wins > 0) {
        ctx.beginPath();
        ctx.arc(cx, cy, outerR, startAngle, startAngle + winArc);
        ctx.arc(cx, cy, innerR, startAngle + winArc, startAngle, true);
        ctx.closePath();
        ctx.fillStyle = '#ef4444';
        ctx.fill();
      }
      ctx.fillStyle = '#374151'; ctx.font = 'bold 15px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(winRate + '%', cx, cy + 5);
    }, 100);

  } catch (e) { el.innerHTML = ''; }
}

async function loadRecentGames() {
  const el = document.getElementById('home-games');
  try {
    const games = await api.getGames();
    if (games.length === 0) {
      el.innerHTML = '<div class="empty"><div class="icon">🏀</div><p>还没有比赛记录</p></div>';
      return;
    }
    const recent = games.slice(0, 5);
    el.innerHTML = `
      <div style="font-weight:700;font-size:.85rem;margin:14px 0 8px;color:var(--text-muted)">最近比赛</div>
      ${recent.map(g => gameCard(g)).join('')}
      ${games.length > 5 ? `<div style="text-align:center;padding:8px"><a href="#/games" style="color:var(--primary);font-size:.85rem;text-decoration:none">查看全部 ${games.length} 场比赛 →</a></div>` : ''}
    `;
    el.querySelectorAll('.game-card').forEach(card => {
      card.addEventListener('click', () => navigate(`/game/${card.dataset.id}`));
    });
  } catch (e) {
    el.innerHTML = '<div class="empty"><p>加载失败</p></div>';
  }
}

function gameCard(g) {
  const our = g.our_score ?? '--';
  const opp = g.opponent_score ?? '--';
  let resultTag = '';
  if (g.status === 'finished' && g.our_score != null && g.opponent_score != null) {
    if (g.our_score > g.opponent_score) resultTag = '<span class="score-tag score-win">胜</span>';
    else if (g.our_score < g.opponent_score) resultTag = '<span class="score-tag score-loss">负</span>';
    else resultTag = '<span class="score-tag score-draw">平</span>';
  }
  let statusTag = '';
  if (g.status === 'live') {
    const today = new Date().toISOString().slice(0, 10);
    if (g.game_date > today) {
      statusTag = '<span style="color:#3b82f6;font-size:.75rem;font-weight:600">◷ 即将开始</span>';
    } else if (g.game_date === today) {
      statusTag = '<span style="color:#f97316;font-size:.75rem;font-weight:600">● 进行中</span>';
    } else {
      statusTag = '<span style="color:#f97316;font-size:.75rem;font-weight:600">● 进行中</span>';
    }
  }
  return `
    <div class="card game-card" data-id="${g.id}">
      <div class="card-row">
        <div>
          <div style="font-size:.8rem;color:var(--text-muted)">${g.game_date}</div>
          <div style="font-weight:700;font-size:1rem">深圳湾女篮 vs ${h(g.opponent)} ${resultTag} ${statusTag}</div>
          ${g.recorder_name ? `<div style="font-size:.75rem;color:var(--text-muted)">记录: ${h(g.recorder_name)}</div>` : ''}
          ${g.location ? `<div style="font-size:.75rem;color:var(--text-muted)">📍 ${h(g.location)}</div>` : ''}
          ${g.notes ? `<div style="font-size:.72rem;color:#f97316;font-weight:600">🔴 ${h(g.notes)}</div>` : ''}
        </div>
        <div style="font-size:1.4rem;font-weight:800;text-align:right">
          ${our} : ${opp}
        </div>
      </div>
    </div>`;
}

function h(str) { return (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

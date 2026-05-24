import { useState, useEffect, useMemo } from 'react'
import { getNewWords, getDueWords, getZoneStats, getTodayWords, getRecentLearnedWords, todayStr } from '../utils/leitner.js'
import { fetchLeaderboard } from '../utils/api.js'
import WordChip from './WordChip.jsx'
import Dictation from './MiniGames/Dictation.jsx'

const ZONES = [
  { id: 'home',      emoji: '🏠', name: '家务英雄',  color: 'home' },
  { id: 'adventure', emoji: '🎪', name: '体验探险',  color: 'adventure' },
  { id: 'food',      emoji: '🍜', name: '美食世界',  color: 'food' },
  { id: 'health',    emoji: '🥗', name: '健康达人',  color: 'health' },
]

function ZoneDetail({ zone, words, progress, onBack, onDictation }) {
  const zoneWords = words.filter(w => w.theme === zone.id)
  const learned = zoneWords.filter(w => progress[w.id])
  const unlearned = zoneWords.filter(w => !progress[w.id])

  return (
    <div className="screen">
      <div className="zone-detail-header">
        <button className="btn btn-muted" style={{ padding: '10px 16px', fontSize: 14 }} onClick={onBack}>
          ← 返回
        </button>
        <div className="zone-detail-title">{zone.emoji} {zone.name}</div>
      </div>

      {learned.length > 0 && (
        <>
          <div className="zones-title">已学（{learned.length} 个）</div>
          {onDictation && (
            <button className="btn btn-start" style={{ color: 'var(--purple)', marginBottom: 8, fontSize: 14 }}
              onClick={() => onDictation(learned)}>
              ✍️ 听写所学
            </button>
          )}
          <div className="today-words-list">
            {learned.map(w => (
              <WordChip key={w.id} word={w}>
                {progress[w.id]?.box >= 5 && <span className="zone-mastered-badge">✓</span>}
              </WordChip>
            ))}
          </div>
        </>
      )}

      {unlearned.length > 0 && (
        <>
          <div className="zones-title">未学（{unlearned.length} 个）</div>
          <div className="today-words-list">
            {unlearned.map(w => (
              <WordChip key={w.id} word={w} className="unlearned" />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export default function Home({ user, progressData, words, onStartSession, onStartPinnedSession, onReviewPinnedWeek, onReviewToday, onLogout }) {
  const [zoneView, setZoneView] = useState(null)
  const [leaderboard, setLeaderboard] = useState(null)
  const [dictationWords, setDictationWords] = useState(null)
  const [pinnedWeek, setPinnedWeek] = useState(null)
  const { progress, totalStars, streak } = progressData

  const availableWeeks = useMemo(() =>
    [...new Set(words.map(w => w.week))].sort((a, b) => a - b),
  [words])

  const pinnedWeekWords = pinnedWeek ? words.filter(w => w.week === pinnedWeek) : []
  const pinnedLearned = pinnedWeekWords.filter(w => progress[w.id]).length
  const pinnedTotal = pinnedWeekWords.length

  useEffect(() => {
    fetchLeaderboard().then(setLeaderboard)
  }, [])
  const newWords = getNewWords(words, progress, 5)
  const reviewWords = getDueWords(words, progress)
  const todayWords = getTodayWords(words, progress)
  const recentWords = getRecentLearnedWords(words, progress, 10)
  const zoneStats = getZoneStats(words, progress)
  const playedToday = progressData.lastActive === todayStr()
  const hasTasks = newWords.length > 0 || reviewWords.length > 0

  if (dictationWords) {
    return (
      <div className="app-shell">
        <Dictation
          words={dictationWords}
          title="听写 ✍️"
          subtitle="听音频，拼写单词！"
          onDone={() => setDictationWords(null)}
          onSkip={() => setDictationWords(null)}
        />
      </div>
    )
  }

  if (zoneView) {
    return (
      <div className="app-shell">
        <ZoneDetail
          zone={zoneView}
          words={words}
          progress={progress}
          onBack={() => setZoneView(null)}
          onDictation={(words) => setDictationWords(words)}
        />
      </div>
    )
  }

  return (
    <div className="app-shell">
      <div className="screen">
        <div className="home-header">
          <div className="home-greeting-name">👋 你好，{user?.nickname}</div>
          <div className="home-stats">
            <div className="stat-badge">🔥 {streak}</div>
            <div className="stat-badge">⭐ {totalStars}</div>
          </div>
        </div>

        <div className="today-card">
          <div className="today-card-title">今日任务</div>
          {hasTasks ? (
            <>
              <div className="today-tasks">
                {newWords.length > 0 && (
                  <div className="today-task-chip">📖 {newWords.length} 个新词</div>
                )}
                {reviewWords.length > 0 && (
                  <div className="today-task-chip">🔄 {reviewWords.length} 个复习</div>
                )}
              </div>
              <button className="btn-start" onClick={onStartSession}>
                {playedToday ? '再来玩一轮！🎮' : '开始今日冒险！✨'}
              </button>
              {recentWords.length > 0 && (
                <button className="btn btn-start" style={{ marginTop: 10, fontSize: 15, background: 'rgba(255,255,255,0.3)', color: 'white' }}
                  onClick={() => onReviewToday(recentWords)}>
                  🔄 复习最近所学（{recentWords.length} 个词）
                </button>
              )}
            </>
          ) : (
            <div className="today-done">
              <div>🎉 今天已完成！明天再来～</div>
              {recentWords.length > 0 && (
                <button className="btn btn-start" style={{ marginTop: 16, fontSize: 15 }}
                  onClick={() => onReviewToday(recentWords)}>
                  🔄 复习最近所学（{recentWords.length} 个词）
                </button>
              )}
            </div>
          )}
        </div>

        {leaderboard && (leaderboard.topStars.length > 0 || leaderboard.topStreak.length > 0) && (
          <div className="leaderboard-card">
            <div className="leaderboard-msg">
              {leaderboard.topStars.slice(0, 3).map(u => u.nickname).filter(Boolean).join('、')} 正在跟你一起学习，一起努力加油哦！
            </div>
            {leaderboard.topStars[0] && (
              <div className="leaderboard-stat">⭐ {leaderboard.topStars[0].nickname} 星星数第一</div>
            )}
            {leaderboard.topStreak[0] && (
              <div className="leaderboard-stat">🔥 {leaderboard.topStreak[0].nickname} 连续打卡天数第一</div>
            )}
          </div>
        )}

        <div className="pinned-card">
          <div className="pinned-title">📖 按周学习</div>
          <div className="pinned-week-row">
            {availableWeeks.map(w => (
              <button
                key={w}
                className={`pinned-week-chip ${pinnedWeek === w ? 'active' : ''}`}
                onClick={() => setPinnedWeek(pinnedWeek === w ? null : w)}
              >
                W{w}
              </button>
            ))}
          </div>
          {pinnedWeek && (
            <div className="pinned-info">
              <div className="pinned-stats">
                Week {pinnedWeek}: {pinnedTotal} 个词（{pinnedLearned} 已学 / {pinnedTotal - pinnedLearned} 未学）
              </div>
              <div className="pinned-actions">
                <button className="btn btn-start" style={{ flex: 1, fontSize: 15 }}
                  onClick={() => onStartPinnedSession(pinnedWeekWords)}>
                  开始学习 W{pinnedWeek}
                </button>
                <button className="btn btn-start" style={{ flex: 1, fontSize: 15, color: 'var(--blue)' }}
                  onClick={() => onReviewPinnedWeek(pinnedWeekWords)}>
                  🔄 复习巩固
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="zones-title">学习进度（点击查看）</div>
        <div className="zones-grid">
          {zoneStats.map((z, i) => {
            const zone = ZONES[i]
            const pct = z.total > 0 ? Math.round((z.learned / z.total) * 100) : 0
            return (
              <button key={zone.id} className={`zone-card zone-${zone.color}`}
                onClick={() => setZoneView(zone)}>
                <div className="zone-emoji">{zone.emoji}</div>
                <div className="zone-name">{zone.name}</div>
                <div className="zone-count">{z.learned}/{z.total} 个词</div>
                <div className="progress-bar-bg">
                  <div
                    className={`progress-bar-fill fill-${zone.color}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </button>
            )
          })}
        </div>

        {todayWords.length > 0 && (
          <>
            <div className="zones-title">今日所学</div>
            <div className="today-words-list">
              {todayWords.map(w => (
                <WordChip key={w.id} word={w} />
              ))}
            </div>
            <button className="btn btn-start" style={{ color: 'var(--blue)', fontSize: 14, marginTop: 8 }}
              onClick={() => setDictationWords(todayWords)}>
              ✍️ 听写今日所学
            </button>
          </>
        )}

        <button
          className="btn btn-muted"
          style={{ display: 'block', margin: '16px auto 0', fontSize: 14 }}
          onClick={onLogout}
        >
          切换用户
        </button>

        <div className="footer-credit">Made by 李丛雅 Raya @ 深圳湾学校</div>
      </div>
    </div>
  )
}

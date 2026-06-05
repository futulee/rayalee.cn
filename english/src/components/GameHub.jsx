import WordChip from './WordChip.jsx'

const GAMES = [
  { id: 'flashcard_review', emoji: '📖', name: '翻卡片', desc: '复习单词，听发音' },
  { id: 'match_review',     emoji: '🎯', name: '连连看', desc: '英文配中文' },
  { id: 'spell_review',     emoji: '🔤', name: '字母拼拼乐', desc: '填入缺失字母' },
  { id: 'fill_review',      emoji: '✏️', name: '填词游戏', desc: '句子填空' },
  { id: 'dictation_review', emoji: '✍️', name: '听写', desc: '听音频，拼写单词' },
]

export default function GameHub({ words, onSelectGame, onFinish, totalStars, hasFillSentences = true }) {
  const games = hasFillSentences ? GAMES : GAMES.filter(g => g.id !== 'fill_review')
  return (
    <div className="screen" style={{ paddingTop: 16 }}>
      <div className="match-header" style={{ position: 'relative' }}>
        <button className="session-close" style={{ position: 'absolute', left: 0, top: -4 }}
          onClick={onFinish}>✕</button>
        <div className="match-title">复习巩固 🏋️</div>
        <div className="match-subtitle">选一个游戏来复习今天的内容吧</div>
      </div>

      {totalStars > 0 && (
        <div className="match-stars-row">⭐ 已获 {totalStars} 颗星星</div>
      )}

      <div className="hub-games-grid">
        {games.map(g => (
          <button
            key={g.id}
            className="hub-game-card"
            onClick={() => onSelectGame(g.id)}
          >
            <div className="hub-game-emoji">{g.emoji}</div>
            <div className="hub-game-name">{g.name}</div>
            <div className="hub-game-desc">{g.desc}</div>
          </button>
        ))}
      </div>

      <div className="hub-words-section" style={{ marginTop: 8 }}>
        <div className="zones-title" style={{ marginBottom: 8 }}>
          复习单词（{words.length} 个）
        </div>
        <div className="today-words-list">
          {words.map(w => (
            <WordChip key={w.id} word={w} />
          ))}
        </div>
      </div>

      <button
        className="btn btn-muted"
        style={{ width: '100%', maxWidth: 320, display: 'block', margin: '16px auto 0' }}
        onClick={onFinish}
      >
        结束复习 👋
      </button>

      <div className="footer-credit">Made by 李丛雅 Raya @ 深圳湾学校</div>
    </div>
  )
}

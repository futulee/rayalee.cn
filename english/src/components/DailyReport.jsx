export default function DailyReport({ earnedStars, learnedCount, reviewedCount, streak, onClose, onReview, onMore }) {
  return (
    <div className="report-screen">
      <div className="report-hero">🏆</div>
      <div className="report-title">今天真棒!</div>
      <div className="report-stars">+{earnedStars} 颗星星</div>

      <div className="report-chips">
        {learnedCount > 0 && (
          <div className="report-chip">📖 新学 {learnedCount} 个词</div>
        )}
        {reviewedCount > 0 && (
          <div className="report-chip">🔄 复习 {reviewedCount} 个词</div>
        )}
        <div className="report-streak">🔥 连续 {streak} 天打卡</div>
      </div>

      {streak >= 3 && (
        <div style={{
          background: 'linear-gradient(135deg, #FFD93D, #FF922B)',
          color: 'white',
          borderRadius: 'var(--radius)',
          padding: '12px 20px',
          fontWeight: 800,
          fontSize: 15,
          textAlign: 'center',
        }}>
          {streak >= 7 ? '🌟 连续一周！厉害！' : `🔥 已连续 ${streak} 天，继续加油！`}
        </div>
      )}

      <button type="button" className="btn btn-primary" style={{ width: '100%', maxWidth: 320 }} onClick={onClose}>
        明天见！👋
      </button>

      {onReview && (
        <button type="button" className="btn btn-start" style={{ width: '100%', maxWidth: 320, color: 'var(--purple)' }}
          onClick={onReview}>
          📖 复习刚刚所学
        </button>
      )}

      {onMore && (
        <button type="button" className="btn btn-start" style={{ width: '100%', maxWidth: 320, color: 'var(--blue)' }}
          onClick={onMore}>
          🔄 今天学的不够，再来一轮
        </button>
      )}

      <div className="footer-credit">Made by 李丛雅 Raya @ 深圳湾学校</div>
    </div>
  )
}

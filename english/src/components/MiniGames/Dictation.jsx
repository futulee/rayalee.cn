import { useState, useEffect, useRef } from 'react'
import { speak, playErrorSound } from '../../utils/speech.js'

function normalize(text) {
  return text.trim().toLowerCase().replace(/[.,!?;:'"]/g, '').replace(/\s+/g, ' ')
}

function isSentence(text) {
  return text.length > 30 || text.includes(' ')
}

export default function Dictation({ words, onDone, onSkip, onBack }) {
  const total = words.length
  if (total === 0) {
    return (
      <div className="flashcard-screen">
        <div style={{ fontSize: 24, fontWeight: 900, color: 'var(--text-muted)' }}>没有可听写的单词</div>
        <button className="btn btn-success" style={{ width: '100%', maxWidth: 300 }}
          onClick={() => onDone(0, {})}>返回</button>
      </div>
    )
  }

  const [round, setRound] = useState(1)
  const [currentWords, setCurrentWords] = useState(words)
  const [idx, setIdx] = useState(0)
  const [input, setInput] = useState('')
  const [phase, setPhase] = useState('input') // input | correct | wrong | summary | done
  const [stars, setStars] = useState(0)
  const [results, setResults] = useState({})
  const [wrongList, setWrongList] = useState([])
  const [totalCorrect, setTotalCorrect] = useState(0)
  const [totalWrong, setTotalWrong] = useState(0)
  const inputRef = useRef(null)

  const current = currentWords[idx]
  if (!current) {
    // Fallback: shouldn't happen
    return (
      <div className="flashcard-screen">
        <div style={{ fontSize: 24, fontWeight: 900, color: 'var(--text-muted)' }}>听写数据异常</div>
        <button className="btn btn-success" style={{ width: '100%', maxWidth: 300 }}
          onClick={() => onDone(stars, results)}>返回</button>
      </div>
    )
  }

  // Auto-play on word change, focus input
  useEffect(() => {
    speak(current.english)
    setInput('')
    setPhase('input')
    setTimeout(() => inputRef.current?.focus(), 200)
  }, [current.id, round])

  const isCorrect = normalize(input) === normalize(current.english)

  const handleSubmit = () => {
    if (!input.trim() || phase !== 'input') return

    if (isCorrect) {
      setStars(s => s + 3)
      setTotalCorrect(c => c + 1)
      setResults(r => ({ ...r, [current.id]: 'correct' }))
      setPhase('correct')
      speak(current.english)
      // Auto-advance after 0.8s
      setTimeout(() => {
        if (idx + 1 >= currentWords.length) {
          finishRound(wrongList)
        } else {
          setIdx(idx + 1)
        }
      }, 800)
    } else {
      playErrorSound()
      setTotalWrong(c => c + 1)
      setWrongList(prev => [...prev, current])
      setResults(r => ({ ...r, [current.id]: 'wrong' }))
      setPhase('wrong')
    }
  }

  const finishRound = (wrongs) => {
    if (wrongs.length === 0) {
      setPhase('done')
    } else {
      setPhase('summary')
    }
  }

  const handleNextRound = () => {
    setCurrentWords(wrongList)
    setWrongList([])
    setIdx(0)
    setRound(r => r + 1)
  }

  const handleSkip = () => {
    if (onSkip) onSkip()
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSubmit()
  }

  // Summary screen
  if (phase === 'summary') {
    const thisRoundCorrect = currentWords.length - wrongList.length
    return (
      <div className="flashcard-screen">
        <div style={{ fontSize: 48 }}>{wrongList.length === 0 ? '🎉' : '📝'}</div>
        <div style={{ fontSize: 22, fontWeight: 900, color: 'var(--text)' }}>
          第 {round} 轮完成
        </div>
        <div style={{ display: 'flex', gap: 24, fontSize: 18, fontWeight: 700 }}>
          <span style={{ color: 'var(--green)' }}>✅ {thisRoundCorrect} 正确</span>
          <span style={{ color: 'var(--red)' }}>❌ {wrongList.length} 需重听</span>
        </div>
        <div className="match-stars-row">⭐ {stars} 颗星星</div>
        {wrongList.length > 0 ? (
          <button className="btn btn-success" style={{ width: '100%', maxWidth: 300 }}
            onClick={handleNextRound}>
            🔄 继续听写（{wrongList.length} 个词）
          </button>
        ) : (
          <button className="btn btn-primary" style={{ width: '100%', maxWidth: 300 }}
            onClick={() => setPhase('done')}>
            完成！
          </button>
        )}
        {onSkip && (
          <button className="btn btn-muted" style={{ width: '100%', maxWidth: 300 }} onClick={handleSkip}>
            跳过听写
          </button>
        )}
      </div>
    )
  }

  // Done screen
  if (phase === 'done') {
    const correctCount = Object.values(results).filter(r => r === 'correct').length
    return (
      <div className="flashcard-screen">
        <div style={{ fontSize: 64 }}>🏆</div>
        <div style={{ fontSize: 24, fontWeight: 900, color: 'var(--purple)' }}>听写完成！</div>
        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-muted)' }}>
          共 {round} 轮，全部 {correctCount} 个单词正确
        </div>
        <div className="match-stars-row">⭐ +{stars} 颗星星</div>
        <button className="btn btn-success" style={{ width: '100%', maxWidth: 300 }}
          onClick={() => onDone(stars, results)}>
          完成！
        </button>
        <button className="btn btn-start" style={{ width: '100%', maxWidth: 300, color: 'var(--purple)' }}
          onClick={() => {
            setCurrentWords(words)
            setWrongList([])
            setIdx(0)
            setRound(1)
            setTotalCorrect(0)
            setTotalWrong(0)
            setStars(0)
            setResults({})
            setPhase('input')
          }}>
          🔄 重新听写全部
        </button>
      </div>
    )
  }

  const currentIsSentence = isSentence(current.english)
  const inputLabel = currentIsSentence ? '输入你听到的句子…' : '输入你听到的单词…'

  // Input / correct / wrong phases
  const isLongWord = current.english.length > 15

  return (
    <div className="screen" style={{ paddingTop: 8 }}>
      <div className="match-header" style={{ position: 'relative' }}>
        {onBack && (
          <button className="session-close" style={{ position: 'absolute', left: 0, top: -4 }}
            onClick={onBack}>✕</button>
        )}
        <div className="match-title">{currentIsSentence ? '句子听写 ✍️' : '听写 ✍️'}</div>
        <div className="match-subtitle">
          第 {idx + 1} / {currentWords.length} 题{round > 1 ? ` · 第${round}轮` : ''}
        </div>
      </div>
      <div className="match-stars-row">⭐ {stars}</div>

      <div className="dictation-card">
        <button className="btn-speak" style={{ fontSize: 28, marginBottom: 8 }}
          onClick={() => speak(current.english)}>
          🔊 点此听音
        </button>
        <div className="dictation-hint">中文提示：{current.chinese}</div>

        {currentIsSentence ? (
          <textarea
            ref={inputRef}
            className={`dictation-input ${phase === 'correct' ? 'correct' : ''} ${phase === 'wrong' ? 'wrong' : ''}`}
            style={{ minHeight: 80, resize: 'vertical', fontFamily: 'inherit', letterSpacing: 1 }}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit() } }}
            disabled={phase !== 'input'}
            placeholder={inputLabel}
            autoComplete="off"
            autoCapitalize="off"
            spellCheck="false"
            rows={3}
          />
        ) : (
          <input
            ref={inputRef}
            className={`dictation-input ${phase === 'correct' ? 'correct' : ''} ${phase === 'wrong' ? 'wrong' : ''}`}
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={phase !== 'input'}
            placeholder={inputLabel}
            autoComplete="off"
            autoCapitalize="off"
            spellCheck="false"
          />
        )}

        {phase === 'input' && (
          <button className="btn btn-primary" style={{ width: '100%', maxWidth: 280, marginTop: 8 }}
            onClick={handleSubmit} disabled={!input.trim()}>
            提交 ✅
          </button>
        )}

        {phase === 'correct' && (
          <div className="dictation-feedback correct">
            ✅ 正确！<strong>{current.english}</strong>
          </div>
        )}

        {phase === 'wrong' && (
          <div className="dictation-feedback wrong">
            <div>❌ 正确答案</div>
            <div className={`dictation-answer-en ${isLongWord ? 'long' : ''}`}>{current.english}</div>
            <div className="dictation-answer-zh">{current.chinese}</div>
            <button className="btn btn-primary" style={{ width: '100%', maxWidth: 280, marginTop: 12 }}
              onClick={() => {
                if (idx + 1 >= currentWords.length) {
                  finishRound(wrongList)
                } else {
                  setIdx(idx + 1)
                }
              }}>
              继续 →
            </button>
          </div>
        )}
      </div>

      {onSkip && phase === 'input' && (
        <button className="btn btn-muted" style={{ width: '100%', maxWidth: 320, display: 'block', margin: '0 auto' }}
          onClick={handleSkip}>
          跳过听写，稍后再来
        </button>
      )}
    </div>
  )
}

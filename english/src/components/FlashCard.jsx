import { useState, useEffect, useRef } from 'react'
import { speak } from '../utils/speech.js'

const TYPE_LABELS = {
  word: '单词', phrase: '短语', grammar: '语法', expression: '表达', sentence: '句子',
}

export default function FlashCard({ word, index, total, onKnow, onSkip, reviewMode, onBack, onPrev, onNext }) {
  const isLongText = word.type === 'sentence' || word.english.length > 30
  const [flipped, setFlipped] = useState(false)
  const [visibleLetters, setVisibleLetters] = useState(0)
  const timerRef = useRef(null)

  const cleanup = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }

  const startTyping = () => {
    cleanup()
    const text = word.english
    const perLetter = Math.max(80, Math.min(150, 800 / text.length)) // faster for long words
    let i = 0
    setVisibleLetters(0)

    // Start speech with a slight delay
    setTimeout(() => speak(text, 0.82), 150)

    timerRef.current = setInterval(() => {
      i++
      if (i >= text.length) {
        setVisibleLetters(text.length)
        cleanup()
      } else {
        setVisibleLetters(i)
      }
    }, perLetter)
  }

  useEffect(() => {
    setFlipped(false)
    setVisibleLetters(0)
    cleanup()
  }, [word.id])

  useEffect(() => {
    return cleanup
  }, [])

  const handleFlip = () => {
    if (!flipped) {
      setFlipped(true)
      if (isLongText) {
        speak(word.english, 0.82)
      } else {
        startTyping()
      }
    } else {
      // Card already flipped: replay pronunciation
      if (isLongText) {
        speak(word.english, 0.82)
      } else {
        startTyping()
      }
    }
  }

  const renderText = (text, color) => {
    return (
      <span className="card-typing-text" style={{ color }}>
        {[...text].map((ch, i) => (
          <span
            key={i}
            className={`card-typing-char ${i < visibleLetters ? 'visible' : ''}`}
          >
            {ch === ' ' ? ' ' : ch}
          </span>
        ))}
        <span className={`card-cursor ${visibleLetters < text.length ? 'blinking' : ''}`}>|</span>
      </span>
    )
  }

  return (
    <div className="flashcard-screen">
      <div style={{ width: '100%', position: 'relative', textAlign: 'center' }}>
        {onBack && (
          <button className="session-close" style={{ position: 'absolute', left: 0, top: -4 }}
            onClick={onBack}>✕</button>
        )}
        <div className="flashcard-counter" style={{ display: 'inline-block' }}>第 {index + 1} / {total} 张</div>
      </div>

      <div
        className={`flip-card-wrap ${isLongText ? 'sentence-card-wrap' : ''} ${flipped ? 'flipped' : ''}`}
        onClick={handleFlip}
      >
        <div className="flip-card-inner">
          <div className={`flip-card-face flip-card-front${isLongText ? ' sentence-card' : ''}`}>
            <div className="card-type-badge">{TYPE_LABELS[word.type] || word.type}</div>
            <div className={`card-english${isLongText ? ' card-english-long' : ''}`}>{word.english}</div>
            {word.hint && <div className="card-hint">{word.hint}</div>}
            <div className="card-tap-hint">点击翻转 👆</div>
          </div>
          <div className={`flip-card-face flip-card-back${isLongText ? ' sentence-card' : ''}`}>
            <button
              className="btn-speak"
              onClick={e => { e.stopPropagation(); handleFlip() }}
            >
              🔊
            </button>
            <div className={`card-english${isLongText ? ' card-english-long' : ''}`} style={{ color: 'var(--blue)' }}>
              {isLongText ? word.english : renderText(word.english, 'var(--blue)')}
            </div>
            <div className={`card-chinese${isLongText ? ' card-chinese-long' : ''}`}>{word.chinese}</div>
            {word.hint && <div className="card-hint">{word.hint}</div>}
          </div>
        </div>
      </div>

      <div className="flashcard-actions" style={{ visibility: flipped ? 'visible' : 'hidden' }}>
        {!reviewMode ? (
          <>
            <button className="btn btn-muted" onClick={onSkip}>再看看 😅</button>
            <button className="btn btn-success" onClick={onKnow}>认识了！✅</button>
          </>
        ) : (
          <>
            {onPrev && <button className="btn btn-muted" onClick={onPrev}>← 上一个</button>}
            {onNext && <button className="btn btn-success" onClick={onNext}>下一个 →</button>}
          </>
        )}
      </div>
    </div>
  )
}

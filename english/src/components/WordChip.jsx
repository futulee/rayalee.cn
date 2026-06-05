import { useState, useRef } from 'react'
import { speak } from '../utils/speech.js'

export default function WordChip({ word, className, showChinese, children }) {
  const [visibleLetters, setVisibleLetters] = useState(-1)
  const timerRef = useRef(null)

  const cleanup = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }

  const isLongText = word.type === 'sentence' || word.english.length > 30

  const handleClick = () => {
    cleanup()
    const text = word.english
    if (isLongText) {
      speak(text, 0.82)
      return
    }
    const perLetter = Math.max(80, Math.min(150, 800 / text.length))
    let i = 0
    setVisibleLetters(0)

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

  const renderText = (text) => {
    // For long text, render plain to avoid per-character inline-block word breaks
    if (isLongText) {
      return (
        <span className="chip-typing-text" style={{ overflowWrap: 'break-word', wordBreak: 'normal' }}>
          {text}
        </span>
      )
    }
    const allVisible = visibleLetters < 0
    return (
      <span className="chip-typing-text">
        {[...text].map((ch, i) => (
          <span
            key={i}
            className={`card-typing-char ${(allVisible || i < visibleLetters) ? 'visible' : ''}`}
          >
            {ch === ' ' ? ' ' : ch}
          </span>
        ))}
        <span className={`card-cursor ${(!allVisible && visibleLetters < text.length) ? 'blinking' : ''}`}>|</span>
      </span>
    )
  }

  return (
    <button className={`today-word-chip ${className || ''}`} onClick={handleClick}>
      <span className="today-word-en">{renderText(word.english)}</span>
      {showChinese !== false && <span className="today-word-zh">{word.chinese}</span>}
      {children}
    </button>
  )
}

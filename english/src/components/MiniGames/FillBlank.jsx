import { useState } from 'react'
import { speak, playErrorSound } from '../../utils/speech.js'
import words from '../../data/words.json'

// Build a lookup: english text → chinese meaning
const wordMap = {}
for (const w of words) {
  if (!wordMap[w.english.toLowerCase()]) {
    wordMap[w.english.toLowerCase()] = w.chinese
  }
}

// Fallback meanings for blanks not in words.json
const FALLBACK = {
  'finished': '完成',
  'given': '给（过去分词）',
  'already': '已经',
  'just': '刚刚',
  'yet': '还（没）',
  'ever': '曾经',
  'never': '从不',
  'haven\'t': '还没有',
  'once': '一次',
  'twice': '两次',
  'a few': '少量（可数）',
  'a little': '少量（不可数）',
  'less': '更少',
  'more': '更多',
  'fewer': '更少',
  'too much': '太多（不可数）',
  'too many': '太多（可数）',
  'plenty of': '大量的',
  'a lot of': '大量的',
  'parade': '游行',
  'famous person': '名人',
  'give the park a new look': '给公园一个新面貌',
}

function getMeaning(english) {
  const key = english.toLowerCase()
  return wordMap[key] || FALLBACK[key] || null
}

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function pickOptions(sentences, correctBlank) {
  const others = sentences
    .filter(s => s.blank !== correctBlank)
    .map(s => s.blank)
  const unique = [...new Set(others)]
  const distractors = shuffle(unique).slice(0, 3)
  return shuffle([correctBlank, ...distractors])
}

// Generate a simple explanation for the answer
function getExplain(sentence, blank) {
  if (blank === 'already' || blank === 'just') return `"${blank}" 表示"已经/刚刚"，常用于现在完成时`
  if (blank === 'ever' || blank === 'never') return `"${blank}" 用于现在完成时，表示"曾经/从不"`
  if (blank === 'once' || blank === 'twice') return `"${blank}" 表示次数`
  if (blank === 'haven\'t') return `"${blank}" 是 have not 的缩写，构成否定句`
  if (blank === 'yet') return `"${blank}" 用于否定句表示"还没/尚未"`
  if (blank === 'a few' || blank === 'a little') return `"${blank}" 表示"少量"，${blank === 'a few' ? '修饰可数名词' : '修饰不可数名词'}`
  if (blank === 'more' || blank === 'less' || blank === 'fewer') return `"${blank}" 用于比较，"${blank === 'more' ? '更多' : '更少'}"`
  if (blank === 'too many' || blank === 'too much') return `"${blank}" 表示"太多"，${blank === 'too many' ? '修饰可数名词' : '修饰不可数名词'}`
  if (blank === 'plenty of' || blank === 'a lot of') return `"${blank}" 表示"大量/许多"`
  return `"${blank}" 填入句子后使句子意思完整、语法正确`
}

export default function FillBlank({ sentences, onDone, onBack }) {
  const total = Math.min(sentences.length, 4)
  const [batch] = useState(() => sentences.slice(0, total))
  const [idx, setIdx] = useState(0)
  const [stars, setStars] = useState(0)
  const [results, setResults] = useState({})
  const [selected, setSelected] = useState(null)
  const [options, setOptions] = useState(() => pickOptions(sentences, batch[0]?.blank))

  const current = batch[idx]
  if (!current) {
    return (
      <div className="flashcard-screen">
        <div style={{ fontSize: 64 }}>🎉</div>
        <div style={{ fontSize: 24, fontWeight: 900, color: 'var(--purple)' }}>填词完成！</div>
        <div className="match-stars-row">⭐ +{stars} 颗星星</div>
        <button className="btn btn-success" style={{ width: '100%', maxWidth: 300 }}
          onClick={() => onDone(stars, results)}>
          继续 →
        </button>
      </div>
    )
  }

  const sentenceParts = current.text.split(current.blank)
  const isCorrect = selected === current.blank

  const handlePick = (option) => {
    if (selected) return
    setSelected(option)
    const correct = option === current.blank
    setResults(r => ({ ...r, [current.id]: correct ? 'correct' : 'wrong' }))
    if (correct) {
      speak(option)
      setStars(s => s + 3)
    } else {
      playErrorSound()
    }
  }

  const handleOptionSpeak = (e, option) => {
    e.stopPropagation()
    speak(option)
  }

  const handleNext = () => {
    const next = idx + 1
    if (next >= total) {
      setIdx(next)
    } else {
      setIdx(next)
      setSelected(null)
      setOptions(pickOptions(sentences, batch[next]?.blank))
    }
  }

  return (
    <div className="screen" style={{ paddingTop: 8 }}>
      <div className="match-header" style={{ position: 'relative' }}>
        {onBack && (
          <button className="session-close" style={{ position: 'absolute', left: 0, top: -4 }}
            onClick={onBack}>✕</button>
        )}
        <div className="match-title">填词游戏 ✏️</div>
        <div className="match-subtitle">第 {idx + 1} / {total} 题</div>
      </div>
      <div className="match-stars-row">⭐ {stars}</div>
      <div className="fill-hint">💡 作答后点击问题和答案跟读</div>

      <div className="fill-sentence-card" onClick={() => selected && speak(current.text)}>
        <div className="fill-sentence-text">
          {sentenceParts[0]}
          <span className="fill-blank-slot">
            {selected ? (
              isCorrect ? (
                <span className="fill-blank-correct">{selected}</span>
              ) : (
                <span className="fill-blank-wrong-wrap">
                  <span className="fill-blank-correct-word">{current.blank}</span>
                  <span className="fill-blank-wrong-word">{selected}</span>
                </span>
              )
            ) : (
              <span className="fill-blank-empty">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>
            )}
          </span>
          {sentenceParts[1]}
        </div>
        {selected && <div className="fill-sentence-chinese">{current.chinese}</div>}
      </div>

      {selected && (
        <div className="fill-explain">
          {isCorrect ? (
            <div className="fill-explain-correct">✅ 正确！{getExplain(current, current.blank)}</div>
          ) : (
            <div className="fill-explain-wrong">
              ❌ 正确答案是 <strong>{current.blank}</strong>
              {getMeaning(current.blank) && <span>（{getMeaning(current.blank)}）</span>}
              <div className="fill-explain-detail">{getExplain(current, current.blank)}</div>
            </div>
          )}
        </div>
      )}

      <div className="fill-options">
        {options.map((opt, i) => {
          const meaning = getMeaning(opt)
          let cls = 'fill-option'
          if (selected === opt && opt === current.blank) cls += ' correct'
          else if (selected === opt && opt !== current.blank) cls += ' wrong'
          else if (selected && opt === current.blank) cls += ' reveal'
          return (
            <button
              key={i}
              className={cls}
              onClick={() => selected ? speak(opt) : handlePick(opt)}
            >
              <span className="fill-opt-text">{opt}</span>
              {selected && meaning && (
                <span className="fill-opt-meaning">{meaning}</span>
              )}
            </button>
          )
        })}
      </div>

      {selected && (
        <div className="fill-next-wrap">
          <button className="btn btn-primary fill-next-btn"
            onClick={handleNext}>
            {idx + 1 >= total ? '完成！' : '下一题 →'}
          </button>
        </div>
      )}
    </div>
  )
}

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

function normalize(s) {
  return s.trim().toLowerCase().replace(/[.,!?;:'"]/g, '').replace(/\s+/g, ' ')
}

// ── Multi-blank mode (sentence-type items) ──

function MultiBlankFill({ current, onNext, onDone, onBack, idx, total, stars, setStars, results, setResults }) {
  const n = current.blanks.length
  const [inputs, setInputs] = useState(current.blanks.map(() => ''))
  const [submitted, setSubmitted] = useState(false)
  const [revealed, setRevealed] = useState(false)

  const handleReveal = () => {
    setRevealed(true)
    // Fill inputs with correct answers so user can see them
    setInputs(current.blanks.map(b => b.display))
  }

  const handleRetry = () => {
    setRevealed(false)
    setSubmitted(false)
    setInputs(current.blanks.map(() => ''))
  }

  const handleInputChange = (i, val) => {
    if (submitted) return
    const next = [...inputs]
    next[i] = val
    setInputs(next)
  }

  const handleSubmit = () => {
    if (revealed) return
    setSubmitted(true)
    speak(current.original)
    let earned = 0
    const res = {}
    for (let i = 0; i < n; i++) {
      const correct = normalize(inputs[i]) === normalize(current.blanks[i].display)
      if (correct) {
        earned += 3
        res[`${current.id}_${i}`] = 'correct'
      } else {
        res[`${current.id}_${i}`] = 'wrong'
      }
    }
    setStars(s => s + earned)
    setResults(r => ({ ...r, ...res }))
  }

  const handleNext = () => {
    if (idx + 1 >= total) {
      onDone()
    } else {
      onNext()
    }
  }

  // Render sentence with ___ replaced by numbered blanks
  const parts = current.text.split('___')
  const sentenceDisplay = []
  parts.forEach((part, i) => {
    if (i > 0) {
      const blank = current.blanks[i - 1]
      const answered = submitted || revealed
      const isCorrect = submitted && normalize(inputs[i - 1]) === normalize(blank.display)
      const isWrong = submitted && !isCorrect
      sentenceDisplay.push(
        <span key={`b_${i}`} style={{
          display: 'inline-block',
          minWidth: 60,
          borderBottom: answered ? (isWrong && !revealed ? '3px solid var(--red)' : '3px solid var(--green)') : '3px dashed var(--purple)',
          margin: '0 4px',
          padding: '0 8px',
          fontWeight: 900,
          color: answered ? (isWrong && !revealed ? 'var(--red)' : 'var(--green)') : 'var(--text-muted)',
          verticalAlign: 'bottom',
        }}>
          {answered ? blank.display : (inputs[i - 1] || '    ')}
        </span>
      )
    }
    sentenceDisplay.push(<span key={`t_${i}`}>{part}</span>)
  })

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

      <div className="fill-sentence-card" onClick={() => speak(current.original)}>
        <div className="fill-sentence-text" style={{ lineHeight: 2.2 }}>
          {sentenceDisplay}
        </div>
        <div className="fill-sentence-chinese">{current.chinese}</div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {current.blanks.map((b, i) => {
          const isCorrect = submitted && normalize(inputs[i]) === normalize(b.display)
          const isWrong = submitted && !isCorrect
          const disabled = submitted || revealed
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-muted)', minWidth: 50 }}>
                {b.chinese || b.word}
              </span>
              <button className="btn-speak" style={{ fontSize: 16, padding: '2px 6px', flexShrink: 0 }}
                onClick={() => speak(b.display)} title="听发音">
                🔊
              </button>
              <input
                className={`dictation-input ${isCorrect || revealed ? 'correct' : ''} ${isWrong ? 'wrong' : ''}`}
                style={{ flex: 1, padding: '10px 14px', fontSize: 16, letterSpacing: 1 }}
                value={inputs[i]}
                onChange={e => handleInputChange(i, e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleSubmit() }}
                disabled={disabled}
                placeholder={isWrong ? b.display : '输入单词…'}
                autoComplete="off"
                autoCapitalize="off"
                spellCheck="false"
              />
              {isWrong && (
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--green)', whiteSpace: 'nowrap' }}>
                  答案：{b.display}
                </span>
              )}
            </div>
          )
        })}
      </div>

      {!submitted && !revealed && (
        <div style={{ marginTop: 16, textAlign: 'center', display: 'flex', gap: 10, justifyContent: 'center' }}>
          <button className="btn btn-muted" style={{ padding: '14px 24px', fontSize: 16 }}
            onClick={handleReveal}>
            💡 提示
          </button>
          <button className="btn btn-primary" style={{ flex: 1, maxWidth: 260 }}
            onClick={handleSubmit}>
            提交 ✅
          </button>
        </div>
      )}

      {revealed && !submitted && (
        <div style={{ marginTop: 16, textAlign: 'center' }}>
          <button className="btn btn-primary" style={{ width: '100%', maxWidth: 320, background: 'var(--orange)' }}
            onClick={handleRetry}>
            🔄 重做
          </button>
        </div>
      )}

      {submitted && (
        <div className="fill-next-wrap">
          <button className="btn btn-primary fill-next-btn" onClick={handleNext}>
            {idx + 1 >= total ? '完成！' : '下一题 →'}
          </button>
        </div>
      )}
    </div>
  )
}

// ── Original single-blank mode ──

function SingleBlankFill({ current, onNext, onDone, idx, total, stars, setStars, results, setResults, sentences }) {
  const [selected, setSelected] = useState(null)
  const [options] = useState(() => pickOptions(sentences, current.blank))

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

  const handleNext = () => {
    if (idx + 1 >= total) {
      onDone()
    } else {
      onNext()
    }
  }

  return (
    <div className="screen" style={{ paddingTop: 8 }}>
      <div className="match-header">
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
              {selected && getMeaning(opt) && (
                <span className="fill-opt-meaning">{getMeaning(opt)}</span>
              )}
            </button>
          )
        })}
      </div>

      {selected && (
        <div className="fill-next-wrap">
          <button className="btn btn-primary fill-next-btn" onClick={handleNext}>
            {idx + 1 >= total ? '完成！' : '下一题 →'}
          </button>
        </div>
      )}
    </div>
  )
}

// ── Main FillBlank component ──

export default function FillBlank({ sentences, onDone, onBack }) {
  const isMultiBlank = sentences.length > 0 && sentences[0].blanks

  if (isMultiBlank) {
    return <MultiBlankFillWrapper sentences={sentences} onDone={onDone} onBack={onBack} />
  }

  const total = Math.min(sentences.length, 4)
  const [batch] = useState(() => sentences.slice(0, total))
  const [idx, setIdx] = useState(0)
  const [stars, setStars] = useState(0)
  const [results, setResults] = useState({})

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

  const handleNext = () => {
    if (idx + 1 >= total) {
      setIdx(total)
    } else {
      setIdx(idx + 1)
    }
  }

  if (idx >= total) {
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

  return (
    <SingleBlankFill
      key={current.id}
      current={current}
      onNext={handleNext}
      onDone={() => onDone(stars, results)}
      idx={idx}
      total={total}
      stars={stars}
      setStars={setStars}
      results={results}
      setResults={setResults}
      sentences={sentences}
    />
  )
}

function MultiBlankFillWrapper({ sentences, onDone, onBack }) {
  const [idx, setIdx] = useState(0)
  const [stars, setStars] = useState(0)
  const [results, setResults] = useState({})

  const current = sentences[idx]
  if (!current) {
    return (
      <div className="flashcard-screen">
        <div style={{ fontSize: 64 }}>🎉</div>
        <div style={{ fontSize: 24, fontWeight: 900, color: 'var(--purple)' }}>填词完成！</div>
        <div className="match-stars-row">⭐ +{stars} 颗星星</div>
        <button className="btn btn-success" style={{ width: '100%', maxWidth: 300 }}
          onClick={() => onDone(stars, results)}>继续 →</button>
      </div>
    )
  }

  const handleNext = () => {
    if (idx + 1 >= sentences.length) {
      setIdx(sentences.length)
    } else {
      setIdx(idx + 1)
    }
  }

  if (idx >= sentences.length) {
    return (
      <div className="flashcard-screen">
        <div style={{ fontSize: 64 }}>🎉</div>
        <div style={{ fontSize: 24, fontWeight: 900, color: 'var(--purple)' }}>填词完成！</div>
        <div className="match-stars-row">⭐ +{stars} 颗星星</div>
        <button className="btn btn-success" style={{ width: '100%', maxWidth: 300 }}
          onClick={() => onDone(stars, results)}>继续 →</button>
      </div>
    )
  }

  return (
    <MultiBlankFill
      key={current.id}
      current={current}
      onNext={handleNext}
      onDone={() => onDone(stars, results)}
      onBack={onBack}
      idx={idx}
      total={sentences.length}
      stars={stars}
      setStars={setStars}
      results={results}
      setResults={setResults}
    />
  )
}

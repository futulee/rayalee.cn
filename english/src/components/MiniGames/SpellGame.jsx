import { useState, useEffect } from 'react'
import { speak, playErrorSound } from '../../utils/speech.js'

function pickHiddenIndices(word, count) {
  const letterIndices = []
  for (let i = 0; i < word.length; i++) {
    if (/[a-zA-Z]/.test(word[i])) letterIndices.push(i)
  }
  const shuffled = [...letterIndices].sort(() => Math.random() - 0.5)
  return new Set(shuffled.slice(0, Math.min(count, letterIndices.length)))
}

function buildPuzzle(word, vocabWords) {
  const chars = word.split('')
  let hidden

  if (vocabWords && vocabWords.length > 0) {
    // Hide all letters of target vocabulary words within the sentence
    hidden = new Set()
    const lower = word.toLowerCase()
    for (const vw of vocabWords) {
      const vLower = vw.toLowerCase()
      let fromIdx = 0
      while (true) {
        const pos = lower.indexOf(vLower, fromIdx)
        if (pos === -1) break
        const startOk = pos === 0 || !/[a-zA-Z]/.test(lower[pos - 1])
        if (startOk) {
          for (let i = pos; i < pos + vLower.length; i++) {
            if (/[a-zA-Z]/.test(chars[i])) hidden.add(i)
          }
        }
        fromIdx = pos + vLower.length
      }
    }
  }

  // Fallback to default random hiding if no vocab words matched
  if (!hidden || hidden.size === 0) {
    const letterCount = chars.filter(c => /[a-zA-Z]/.test(c)).length
    const hideCount = Math.max(1, Math.min(3, Math.floor(letterCount * 0.35)))
    hidden = pickHiddenIndices(word, hideCount)
  }

  const missing = []
  const display = chars.map((c, i) => {
    if (hidden.has(i)) {
      missing.push(c.toLowerCase())
      return { type: 'blank', index: missing.length - 1, letter: c.toLowerCase() }
    }
    return { type: 'letter', char: c }
  })

  // Tiles: each missing letter gets its own tile with unique id
  const missingTiles = missing.map((letter, i) => ({ id: `m${i}`, letter }))
  const distractorPool = 'abcdefghijklmnopqrstuvwxyz'.split('')
    .filter(l => !missing.includes(l))
  const distractors = []
  for (let i = 0; i < Math.min(2, distractorPool.length); i++) {
    const ri = Math.floor(Math.random() * distractorPool.length)
    distractors.push(distractorPool.splice(ri, 1)[0])
  }
  const distractorTiles = distractors.map((letter, i) => ({ id: `d${i}`, letter }))
  const tiles = [...missingTiles, ...distractorTiles].sort(() => Math.random() - 0.5)

  return { display, missing, tiles, blankCount: missing.length }
}

// Play pronunciation 3 times with gaps, then advance after a pause
function speakThreeTimes(text, onDone) {
  speak(text)
  let count = 1
  const timer = setInterval(() => {
    count++
    if (count > 3) {
      clearInterval(timer)
      setTimeout(onDone, 500)
    } else {
      speak(text)
    }
  }, 900)
}

export default function SpellGame({ words, onDone, onBack, getVocabFor }) {
  const [batch] = useState(words)
  const [idx, setIdx] = useState(0)
  const [puzzle, setPuzzle] = useState(() => {
    const w = batch[0]
    return buildPuzzle(w?.english || '', getVocabFor ? getVocabFor(w) : null)
  })
  const [filled, setFilled] = useState([])
  const [currentBlank, setCurrentBlank] = useState(0)
  const [stars, setStars] = useState(0)
  const [results, setResults] = useState({})
  const [wrongTile, setWrongTile] = useState(null)
  const [done, setDone] = useState(false)
  const [advancing, setAdvancing] = useState(false)
  const [usedTileIds, setUsedTileIds] = useState(new Set())

  useEffect(() => {
    if (batch[0]) speak(batch[0].english)
  }, [])

  if (done) {
    return (
      <div className="flashcard-screen">
        <div style={{ fontSize: 64 }}>🎉</div>
        <div style={{ fontSize: 24, fontWeight: 900, color: 'var(--purple)' }}>拼写完成！</div>
        <div className="match-stars-row">⭐ +{stars} 颗星星</div>
        <button className="btn btn-success" style={{ width: '100%', maxWidth: 300 }}
          onClick={() => onDone(stars, results)}>
          继续 →
        </button>
      </div>
    )
  }

  const current = batch[idx]
  if (!current) {
    return (
      <div className="flashcard-screen">
        <div style={{ fontSize: 24, fontWeight: 900, color: 'var(--text-muted)' }}>没有可拼写的单词</div>
        <button className="btn btn-success" style={{ width: '100%', maxWidth: 300 }}
          onClick={() => onDone(0, {})}>
          继续 →
        </button>
      </div>
    )
  }

  const handleAdvance = () => {
    const next = idx + 1
    if (next >= batch.length) {
      setDone(true)
    } else {
      setIdx(next)
      const w = batch[next]
      setPuzzle(buildPuzzle(w?.english || '', getVocabFor ? getVocabFor(w) : null))
      setFilled([])
      setUsedTileIds(new Set())
      setCurrentBlank(0)
      setWrongTile(null)
      setAdvancing(false)
      speak(batch[next].english)
    }
  }

  const handleTileTap = (tileId, letter) => {
    if (wrongTile || advancing) return

    const expected = puzzle.missing[currentBlank]
    if (letter === expected) {
      const newFilled = [...filled, letter]
      setFilled(newFilled)
      setUsedTileIds(prev => new Set([...prev, tileId]))
      setWrongTile(null)

      if (newFilled.length >= puzzle.blankCount) {
        setStars(s => s + 3)
        setResults(r => ({ ...r, [current.id]: 'correct' }))
        setAdvancing(true)
        speakThreeTimes(current.english, handleAdvance)
      } else {
        setCurrentBlank(currentBlank + 1)
      }
    } else {
      setWrongTile(tileId)
      playErrorSound()
      setTimeout(() => setWrongTile(null), 500)
    }
  }

  const handleReplay = () => {
    speak(current.english)
  }

  const segments = []
  puzzle.display.forEach((part, i) => {
    if (part.type === 'letter') {
      if (part.char === ' ') {
        segments.push({ type: 'space', key: `s${i}` })
      } else {
        segments.push({ type: 'text', char: part.char, key: `t${i}` })
      }
    } else {
      const fillLetter = filled[part.index]
      segments.push({
        type: 'blank',
        filled: !!fillLetter,
        letter: fillLetter || '',
        active: part.index === currentBlank && !fillLetter,
        key: `b${i}`,
      })
    }
  })

  const isLongWord = current.english.length > 12
  const isVocabMode = getVocabFor && getVocabFor(current) && getVocabFor(current).length > 0

  return (
    <div className="screen" style={{ paddingTop: 8 }}>
      <div className="match-header" style={{ position: 'relative' }}>
        {onBack && (
          <button className="session-close" style={{ position: 'absolute', left: 0, top: -4 }}
            onClick={onBack}>✕</button>
        )}
        <div className="match-title">字母拼拼乐 🔤</div>
        <div className="match-subtitle">第 {idx + 1} / {batch.length} 题</div>
      </div>
      <div className="match-stars-row">⭐ {stars}</div>

      <div className="spell-word-card" onClick={handleReplay}>
        <div className="spell-chinese">{current.chinese}</div>
        <div className={`spell-word-row ${isLongWord ? 'spell-word-compact' : ''} ${isVocabMode ? 'spell-sentence-row' : ''}`}>
          {segments.map(seg => {
            if (seg.type === 'space') return <span key={seg.key} className="spell-space" />
            return (
              <span key={seg.key} className={[
                'spell-char',
                isLongWord ? 'spell-char-sm' : '',
                seg.type === 'blank' && 'spell-blank',
                seg.type === 'blank' && seg.active && 'spell-blank-active',
                seg.type === 'blank' && seg.filled && 'spell-blank-filled',
              ].filter(Boolean).join(' ')}>
                {seg.type === 'text' ? seg.char : (seg.filled ? seg.letter : ' ')}
              </span>
            )
          })}
        </div>
      </div>

      <div className="spell-tiles">
        {puzzle.tiles.map((tile) => {
          const used = usedTileIds.has(tile.id)
          const isWrong = wrongTile === tile.id
          return (
            <button
              key={tile.id}
              className={`spell-tile ${used ? 'used' : ''} ${isWrong ? 'wrong' : ''}`}
              onClick={() => !used && !advancing && handleTileTap(tile.id, tile.letter)}
              disabled={used || advancing}
            >
              {tile.letter}
            </button>
          )
        })}
      </div>
    </div>
  )
}

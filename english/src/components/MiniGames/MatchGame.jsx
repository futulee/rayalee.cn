import { useState, useEffect } from 'react'
import { speak, playErrorSound } from '../../utils/speech.js'

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function buildTiles(words) {
  const enTiles = words.map((w, i) => ({
    id: `en_${i}`, wordId: w.id, text: w.english, side: 'english', pairIdx: i, state: 'idle',
  }))
  const zhTiles = words.map((w, i) => ({
    id: `zh_${i}`, wordId: w.id, text: w.chinese, side: 'chinese', pairIdx: i, state: 'idle',
  }))
  return shuffle([...enTiles, ...zhTiles])
}

const PER_PAGE = 4

export default function MatchGame({ words, title, subtitle, onDone, onBack }) {
  const isSentenceMode = words.some(w => w.type === 'sentence')
  const allWords = words
  const usePaging = allWords.length > 6
  const [batchStart, setBatchStart] = useState(0)
  const batchWords = usePaging ? allWords.slice(batchStart, batchStart + PER_PAGE) : allWords
  const [tiles, setTiles] = useState(() => buildTiles(batchWords))
  const [selected, setSelected] = useState(null)
  const [stars, setStars] = useState(0)
  const [results, setResults] = useState({})
  const [celebrating, setCelebrating] = useState(false)

  const total = batchWords.length
  const matchedCount = tiles.filter(t => t.state === 'correct').length / 2

  useEffect(() => {
    setTiles(buildTiles(batchWords))
    setSelected(null)
  }, [batchStart])

  const handleTileTap = (tile) => {
    if (tile.state !== 'idle') return

    if (!selected) {
      setSelected(tile.id)
      if (tile.side === 'english') speak(tile.text)
      return
    }

    const selTile = tiles.find(t => t.id === selected)
    if (!selTile || selTile.id === tile.id) {
      setSelected(tile.id)
      if (tile.side === 'english') speak(tile.text)
      return
    }

    if (selTile.side === tile.side) {
      setSelected(tile.id)
      if (tile.side === 'english') speak(tile.text)
      return
    }

    const isMatch = selTile.pairIdx === tile.pairIdx
    const wordId = batchWords[selTile.pairIdx]?.id || batchWords[tile.pairIdx]?.id

    if (isMatch) {
      speak(selTile.side === 'english' ? selTile.text : tile.text)
      setTiles(prev => prev.map(t =>
        t.id === selTile.id || t.id === tile.id ? { ...t, state: 'correct' } : t
      ))
      setStars(s => s + 2)
      setResults(r => ({ ...r, [wordId]: 'correct' }))
      setSelected(null)

      setTimeout(() => {
        setTiles(prev => {
          const updated = prev.map(t => t.state === 'correct' ? { ...t, state: 'gone' } : t)
          const allGone = updated.every(t => t.state === 'gone')
          if (allGone) {
            if (usePaging && batchStart + PER_PAGE < allWords.length) {
              setBatchStart(batchStart + PER_PAGE)
            } else {
              setCelebrating(true)
            }
          }
          return updated
        })
      }, 600)
    } else {
      setTiles(prev => prev.map(t =>
        t.id === selTile.id || t.id === tile.id ? { ...t, state: 'wrong' } : t
      ))
      setResults(r => ({ ...r, [wordId]: r[wordId] || 'wrong' }))
      playErrorSound()
      setSelected(null)
      setTimeout(() => {
        setTiles(prev => prev.map(t =>
          t.state === 'wrong' ? { ...t, state: 'idle' } : t
        ))
      }, 500)
    }
  }

  if (celebrating) {
    return (
      <div className="flashcard-screen">
        <div style={{ fontSize: 64 }}>🎉</div>
        <div style={{ fontSize: 24, fontWeight: 900, color: 'var(--purple)' }}>太棒了！</div>
        <div className="match-stars-row">⭐ +{stars} 颗星星</div>
        <button className="btn btn-success" style={{ width: '100%', maxWidth: 300 }}
          onClick={() => onDone(stars, results)}>
          继续 →
        </button>
      </div>
    )
  }

  const pageInfo = usePaging ? ` 第${batchStart / PER_PAGE + 1}页` : ''

  return (
    <div className="screen" style={{ paddingTop: 8 }}>
      <div className="match-header" style={{ position: 'relative' }}>
        {onBack && (
          <button className="session-close" style={{ position: 'absolute', left: 0, top: -4 }}
            onClick={onBack}>✕</button>
        )}
        <div className="match-title">{title || '连连看 🎯'}</div>
        <div className="match-subtitle">
          {subtitle || `已配对 ${matchedCount}/${total}${pageInfo}`}
        </div>
      </div>
      <div className="match-stars-row">⭐ {stars}</div>
      <div className={`match-grid${isSentenceMode ? ' match-grid-single' : ''}`}>
        {tiles.map(tile => (
          <button
            key={tile.id}
            className={[
              'match-tile',
              isSentenceMode ? 'match-tile-long' : '',
              tile.side,
              tile.id === selected ? 'selected' : '',
              tile.state === 'correct' ? 'correct' : '',
              tile.state === 'wrong' ? 'wrong' : '',
              tile.state === 'gone' ? 'gone' : '',
            ].filter(Boolean).join(' ')}
            onClick={() => handleTileTap(tile)}
            disabled={tile.state === 'gone'}
          >
            {tile.text}
          </button>
        ))}
      </div>
    </div>
  )
}

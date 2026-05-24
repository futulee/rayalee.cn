import { useState, useMemo } from 'react'
import FlashCard from './FlashCard.jsx'
import MatchGame from './MiniGames/MatchGame.jsx'
import SpellGame from './MiniGames/SpellGame.jsx'
import FillBlank from './MiniGames/FillBlank.jsx'
import Dictation from './MiniGames/Dictation.jsx'
import GameHub from './GameHub.jsx'
import DailyReport from './DailyReport.jsx'
import { processAnswer, initWord } from '../utils/leitner.js'
import sentences from '../data/sentences.json'

// new-learning: learn → match_new → spell → fill_blank → review → dictation → done
// review-only:  hub ⇄ any game → done
export default function SessionView({ newWords, reviewWords, progress, streak, onDone, onMoreWords, onClose }) {
  const [forceHub, setForceHub] = useState(false)
  const [phase, setPhase] = useState(
    newWords.length > 0 ? 'learn' : (reviewWords.length > 0 ? 'hub' : 'done')
  )
  const [learnIndex, setLearnIndex] = useState(0)
  const [learnedWords, setLearnedWords] = useState([])
  const [localProgress, setLocalProgress] = useState(progress)
  const [totalStars, setTotalStars] = useState(0)
  const [learnedCount, setLearnedCount] = useState(0)
  const [reviewedCount, setReviewedCount] = useState(0)
  const [hubReviewIdx, setHubReviewIdx] = useState(0)
  const [hubWordsOverride, setHubWordsOverride] = useState(null)

  const isHubMode = forceHub || (newWords.length === 0 && reviewWords.length > 0)
  const hubWords = hubWordsOverride || (learnedWords.length > 0 ? learnedWords : reviewWords)
  const reportHubWords = [...learnedWords, ...reviewWords].filter(
    (w, i, arr) => arr.findIndex(x => x.id === w.id) === i
  )

  const matchSentences = useMemo(() => {
    const wordThemes = new Set([...newWords, ...reviewWords].map(w => w.theme))
    const matching = sentences.filter(s => wordThemes.has(s.theme) || (newWords.length === 0 && reviewWords.length === 0))
    return matching.length >= 2 ? matching : sentences.slice(0, 4)
  }, [newWords, reviewWords])

  // ── progress bar (only for new-learning flow) ──
  const hasLearnFlow = newWords.length > 0
  const totalSteps = hasLearnFlow
    ? newWords.length + 1 + 1 + 1 + (reviewWords.length > 0 ? 1 : 0) + 1
    : 1
  const currentStep = hasLearnFlow
    ? (phase === 'learn' ? learnIndex :
       phase === 'match_new' ? newWords.length :
       phase === 'spell' ? newWords.length + 1 :
       phase === 'fill_blank' ? newWords.length + 2 :
       phase === 'review' ? newWords.length + 3 :
       totalSteps)
    : 0
  const progressPct = Math.round((currentStep / Math.max(totalSteps, 1)) * 100)

  // ── new-learning handlers ──
  const advanceLearn = (knew) => {
    const word = newWords[learnIndex]
    if (knew) {
      const p = initWord(word.id)
      setLocalProgress(prev => ({ ...prev, [word.id]: p }))
      setLearnedWords(prev => [...prev, word])
      setLearnedCount(c => c + 1)
    }
    const nextIndex = learnIndex + 1
    if (nextIndex >= newWords.length) {
      if (learnedWords.length + (knew ? 1 : 0) >= 1) {
        setPhase('match_new')
      } else {
        setPhase('fill_blank')
      }
    } else {
      setLearnIndex(nextIndex)
    }
  }

  const handleMatchNewDone = (stars, results) => {
    let p = { ...localProgress }
    for (const [wordId, outcome] of Object.entries(results)) {
      p = { ...p, [wordId]: processAnswer(p, wordId, outcome === 'correct') }
    }
    setLocalProgress(p)
    setTotalStars(s => s + stars)
    setPhase('spell')
  }

  const handleSpellDone = (stars) => {
    setTotalStars(s => s + stars)
    setPhase('fill_blank')
  }

  const handleFillBlankDone = (stars) => {
    setTotalStars(s => s + stars)
    if (reviewWords.length > 0) {
      setPhase('review')
    } else {
      setPhase('done')
    }
  }

  const handleReviewDone = (stars, results) => {
    let p = { ...localProgress }
    for (const [wordId, outcome] of Object.entries(results)) {
      p = { ...p, [wordId]: processAnswer(p, wordId, outcome === 'correct') }
    }
    setLocalProgress(p)
    setTotalStars(s => s + stars)
    setReviewedCount(reviewWords.length)
    setPhase('dictation')
  }

  const handleDictationDone = (stars) => {
    setTotalStars(s => s + stars)
    setPhase('done')
  }

  // ── hub handlers ──
  const handleHubGameDone = (stars, results) => {
    // Update progress for match games from hub
    if (results && Object.keys(results).length > 0) {
      let p = { ...localProgress }
      for (const [wordId, outcome] of Object.entries(results)) {
        if (outcome === 'correct' || outcome === 'wrong') {
          p = { ...p, [wordId]: processAnswer(p, wordId, outcome === 'correct') }
        }
      }
      setLocalProgress(p)
    }
    setTotalStars(s => s + stars)
    setPhase('hub')
  }

  const handleHubFinish = () => {
    onDone(localProgress, totalStars)
  }

  const handleFinalDone = () => {
    onDone(localProgress, totalStars)
  }

  const handleReportReview = () => {
    setForceHub(true)
    setHubWordsOverride(null)
    if (reportHubWords.length > 0) {
      setLearnedWords(reportHubWords)
    }
    setPhase('hub')
  }

  const handleReportMore = () => {
    onMoreWords(localProgress, totalStars)
  }

  return (
    <div className="app-shell">
      {/* topbar: hidden in hub & done */}
      {phase !== 'done' && phase !== 'hub' && (
        <div className="screen" style={{ flex: 'none', paddingBottom: 0, paddingTop: 16 }}>
          <div className="session-topbar">
            <button className="session-close" onClick={() => isHubMode ? setPhase('hub') : onClose()}>✕</button>
            {!isHubMode && (
              <div className="session-progress-bar">
                <div className="session-progress-fill" style={{ width: `${progressPct}%` }} />
              </div>
            )}
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-muted)', minWidth: 36 }}>
              ⭐{totalStars}
            </span>
          </div>
        </div>
      )}

      {/* ── New-learning phases ── */}
      {phase === 'learn' && (
        <FlashCard
          word={newWords[learnIndex]}
          index={learnIndex}
          total={newWords.length}
          onBack={onClose}
          onKnow={() => advanceLearn(true)}
          onSkip={() => advanceLearn(false)}
        />
      )}

      {phase === 'match_new' && learnedWords.length >= 1 && (
        <MatchGame
          words={learnedWords}
          title="连连看 🎯"
          subtitle="把英文和中文配起来！"
          onBack={onClose}
          onDone={handleMatchNewDone}
        />
      )}

      {phase === 'spell' && (learnedWords.length >= 1 || reviewWords.length >= 1) && (
        <SpellGame
          words={learnedWords.length >= 1 ? learnedWords : reviewWords}
          onBack={onClose}
          onDone={handleSpellDone}
        />
      )}

      {phase === 'fill_blank' && (
        <FillBlank
          sentences={matchSentences}
          onBack={onClose}
          onDone={handleFillBlankDone}
        />
      )}

      {phase === 'review' && (
        <MatchGame
          words={reviewWords}
          title="复习时间 🔄"
          subtitle="还记得这些词吗？"
          onBack={onClose}
          onDone={handleReviewDone}
        />
      )}

      {phase === 'dictation' && (
        <Dictation
          words={learnedWords.length >= 1 ? learnedWords : reviewWords}
          title="听写 ✍️"
          subtitle="听听写写，检验一下！"
          onBack={onClose}
          onDone={handleDictationDone}
          onSkip={() => setPhase('done')}
        />
      )}

      {/* ── Hub & hub games ── */}
      {phase === 'hub' && (
        <GameHub
          words={hubWords}
          totalStars={totalStars}
          onSelectGame={setPhase}
          onFinish={handleHubFinish}
        />
      )}

      {phase === 'flashcard_review' && (
        <FlashCard
          word={hubWords[hubReviewIdx]}
          index={hubReviewIdx}
          total={hubWords.length}
          reviewMode
          onBack={() => setPhase('hub')}
          onPrev={() => setHubReviewIdx(i => Math.max(0, i - 1))}
          onNext={() => {
            if (hubReviewIdx + 1 >= hubWords.length) {
              setHubReviewIdx(0)
              setPhase('hub')
            } else {
              setHubReviewIdx(i => i + 1)
            }
          }}
        />
      )}

      {phase === 'match_review' && (
        <MatchGame
          words={hubWords}
          title="连连看 🎯"
          subtitle="英文配中文，复习一下！"
          onBack={() => setPhase('hub')}
          onDone={(stars, results) => handleHubGameDone(stars, results)}
        />
      )}

      {phase === 'spell_review' && (
        <SpellGame
          words={hubWords}
          onBack={() => setPhase('hub')}
          onDone={(stars) => handleHubGameDone(stars, null)}
        />
      )}

      {phase === 'fill_review' && (
        <FillBlank
          sentences={matchSentences}
          onBack={() => setPhase('hub')}
          onDone={(stars) => handleHubGameDone(stars, null)}
        />
      )}

      {phase === 'dictation_review' && (
        <Dictation
          words={hubWords}
          title="听写 ✍️"
          subtitle="听听写写，记住拼写！"
          onBack={() => setPhase('hub')}
          onDone={(stars) => handleHubGameDone(stars, null)}
          onSkip={() => setPhase('hub')}
        />
      )}

      {/* ── Done ── */}
      {phase === 'done' && (
        <DailyReport
          earnedStars={totalStars}
          learnedCount={learnedCount}
          reviewedCount={reviewedCount}
          streak={streak + 1}
          onClose={handleFinalDone}
          onReview={handleReportReview}
          onMore={handleReportMore}
        />
      )}

    </div>
  )
}

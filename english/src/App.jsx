import { useState, useEffect } from 'react'
import './App.css'
import words from './data/words.json'
import Login from './components/Login.jsx'
import Home from './components/Home.jsx'
import SessionView from './components/SessionView.jsx'
import { loadUser, saveUser, saveCreds, clearCreds } from './utils/storage.js'
import { fetchProgress, syncProgress, authUser } from './utils/api.js'
import { getNewWords, getDueWords, todayStr } from './utils/leitner.js'

export default function App() {
  const [user, setUser] = useState(null)
  const [progressData, setProgressData] = useState({
    progress: {}, totalStars: 0, streak: 0, lastActive: null,
  })
  const [view, setView] = useState('loading')
  const [reviewModeWords, setReviewModeWords] = useState(null)
  const [pinnedWeekWords, setPinnedWeekWords] = useState(null)
  const [sessionKey, setSessionKey] = useState(0)

  useEffect(() => {
    const saved = loadUser()
    if (saved) {
      setUser(saved)
      fetchProgress(saved.userId).then(data => {
        setProgressData(data || { progress: {}, totalStars: 0, streak: 0, lastActive: null })
        setView('home')
      }).catch(() => setView('home'))
    } else {
      setView('login')
    }
  }, [])

  const handleLogin = async (nickname, pin) => {
    const userData = await authUser(nickname, pin)
    saveUser(userData)
    saveCreds(nickname, pin)
    setUser(userData)
    const data = await fetchProgress(userData.userId)
    setProgressData(data || { progress: {}, totalStars: 0, streak: 0, lastActive: null })
    setView('home')
  }

  const saveProgressData = (updatedProgress, earnedStars) => {
    const today = todayStr()
    const prev = progressData
    const newTotalStars = (prev.totalStars || 0) + earnedStars

    let newStreak = prev.streak || 0
    if (prev.lastActive !== today) {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      const yStr = yesterday.toISOString().split('T')[0]
      newStreak = prev.lastActive === yStr ? newStreak + 1 : 1
    }

    const updated = {
      progress: updatedProgress,
      totalStars: newTotalStars,
      streak: newStreak,
      lastActive: today,
    }
    setProgressData(updated)
    if (user) syncProgress(user.userId, updated)
    return updated
  }

  const handleSessionDone = (updatedProgress, earnedStars) => {
    saveProgressData(updatedProgress, earnedStars)
    setPinnedWeekWords(null)
    setView('home')
  }

  const handleMoreWords = (updatedProgress, earnedStars) => {
    saveProgressData(updatedProgress, earnedStars)
    setReviewModeWords(null)
    setSessionKey(k => k + 1)
    setView('session')
  }

  const handleStartPinnedSession = (weekWords) => {
    setPinnedWeekWords(weekWords)
    setReviewModeWords(null)
    setSessionKey(k => k + 1)
    setView('session')
  }

  const handleReviewPinnedWeek = (weekWords) => {
    setPinnedWeekWords(null)
    setReviewModeWords(weekWords)
    setSessionKey(k => k + 1)
    setView('session')
  }

  const handleReviewToday = (words) => {
    setReviewModeWords(words)
    setSessionKey(k => k + 1)
    setView('session')
  }

  if (view === 'loading') {
    return <div className="loading-screen">🌟</div>
  }

  if (view === 'login') {
    return <Login onLogin={handleLogin} />
  }

  if (view === 'session') {
    const newWords = pinnedWeekWords
      ? pinnedWeekWords.filter(w => !progressData.progress[w.id])
      : reviewModeWords ? [] : getNewWords(words, progressData.progress, 5)
    const reviewWords = pinnedWeekWords
      ? getDueWords(pinnedWeekWords, progressData.progress)
      : reviewModeWords || getDueWords(words, progressData.progress).slice(0, 10)
    return (
      <SessionView
        key={sessionKey}
        newWords={newWords}
        reviewWords={reviewWords}
        progress={progressData.progress}
        streak={progressData.streak || 0}
        onDone={handleSessionDone}
        onMoreWords={handleMoreWords}
        onClose={() => { setView('home'); setReviewModeWords(null); setPinnedWeekWords(null) }}
      />
    )
  }

  return (
    <Home
      user={user}
      progressData={progressData}
      words={words}
      onStartSession={() => { setPinnedWeekWords(null); setReviewModeWords(null); setSessionKey(k => k + 1); setView('session') }}
      onStartPinnedSession={handleStartPinnedSession}
      onReviewPinnedWeek={handleReviewPinnedWeek}
      onReviewToday={handleReviewToday}
      onLogout={() => { setUser(null); saveUser(null); clearCreds(); setView('login') }}
    />
  )
}

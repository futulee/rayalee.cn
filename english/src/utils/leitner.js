export function todayStr() {
  return new Date().toISOString().split('T')[0]
}

function addDays(dateStr, days) {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

// Days between reviews for boxes 1-5
const INTERVALS = [1, 2, 4, 7, 14]

export function processAnswer(progress, wordId, isCorrect) {
  const today = todayStr()
  const current = progress[wordId] || { box: 0, correct: 0, wrong: 0, learnedAt: today }
  if (isCorrect) {
    const newBox = Math.min((current.box || 0) + 1, 5)
    return {
      ...current,
      box: newBox,
      nextReview: addDays(today, INTERVALS[newBox - 1]),
      correct: (current.correct || 0) + 1,
      lastSeen: today,
    }
  } else {
    return {
      ...current,
      box: 1,
      nextReview: today,
      wrong: (current.wrong || 0) + 1,
      lastSeen: today,
    }
  }
}

export function initWord(wordId) {
  const today = todayStr()
  return { box: 1, nextReview: addDays(today, 1), correct: 0, wrong: 0, learnedAt: today, lastSeen: today }
}

export function getDueWords(allWords, progress) {
  const today = todayStr()
  return allWords.filter(w => {
    const p = progress[w.id]
    return p && p.box < 5 && p.nextReview <= today
  })
}

export function getNewWords(allWords, progress, limit = 5) {
  return allWords.filter(w => !progress[w.id]).slice(0, limit)
}

export function getTodayWords(allWords, progress) {
  const today = todayStr()
  return allWords.filter(w => {
    const p = progress[w.id]
    return p && (p.lastSeen === today || p.learnedAt === today)
  })
}

export function getRecentLearnedWords(allWords, progress, limit = 10) {
  return allWords
    .filter(w => progress[w.id])
    .sort((a, b) => (progress[b.id]?.learnedAt || '').localeCompare(progress[a.id]?.learnedAt || ''))
    .slice(0, limit)
}

export function getZoneStats(allWords, progress) {
  const themes = ['home', 'adventure', 'food', 'health']
  return themes.map(theme => {
    const words = allWords.filter(w => w.theme === theme)
    const learned = words.filter(w => progress[w.id]).length
    const mastered = words.filter(w => progress[w.id]?.box >= 5).length
    return { theme, total: words.length, learned, mastered }
  })
}

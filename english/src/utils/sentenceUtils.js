import wordsData from '../data/words.json'

const vocabWords = wordsData.filter(w => w.type !== 'sentence')

/**
 * Find vocabulary words that appear in a sentence.
 * Returns matches sorted by position, with overlapping matches resolved (longer wins).
 * Each match includes the actual text from the sentence (preserving case/plural).
 */
function findVocabInSentence(sentence) {
  const lower = sentence.toLowerCase()
  const raw = []

  for (const v of vocabWords) {
    const word = v.english.toLowerCase()
    let from = 0
    while (true) {
      const idx = lower.indexOf(word, from)
      if (idx === -1) break

      const startOk = idx === 0 || !/[a-zA-Z]/.test(lower[idx - 1])
      if (startOk) {
        const end = idx + word.length
        const endChar = lower[end]
        const endOk =
          end >= lower.length ||
          !/[a-zA-Z]/.test(endChar) ||
          (endChar === 's' && (end + 1 >= lower.length || !/[a-zA-Z]/.test(lower[end + 1])))

        if (endOk) {
          // Include trailing 's' (plural) in the actual match
          const actualEnd = (endChar === 's' && !/[a-zA-Z]/.test(lower[end + 1] || '')) ? end + 1 : end
          const actualText = sentence.substring(idx, actualEnd)
          raw.push({ word: v.english, chinese: v.chinese, week: v.week, start: idx, end: idx + word.length, actualEnd, actualText })
        }
      }
      from = idx + word.length
    }
  }

  raw.sort((a, b) => a.start - b.start)

  const filtered = []
  for (const m of raw) {
    const last = filtered[filtered.length - 1]
    if (!last || m.start >= last.actualEnd) {
      filtered.push(m)
    } else if (m.word.length > last.word.length) {
      filtered[filtered.length - 1] = m
    }
  }

  return filtered
}

/**
 * Convert a sentence item and its vocab matches into a multi-blank FillBlank entry.
 * Each sentence produces ONE entry with multiple blanks.
 */
function sentenceToFillBlank(sentenceItem) {
  const matches = findVocabInSentence(sentenceItem.english)
  if (matches.length === 0) return null

  // Build the text with ___ placeholders (replace from end to preserve positions)
  let text = sentenceItem.english
  const blanks = []
  const sorted = [...matches].sort((a, b) => b.start - a.start)

  for (const m of sorted) {
    const prefix = text.substring(0, m.start)
    const suffix = text.substring(m.actualEnd)
    text = prefix + '___' + suffix
    blanks.unshift({ word: m.word, display: m.actualText, chinese: m.chinese })
  }

  return {
    id: sentenceItem.id,
    text,
    blanks,
    original: sentenceItem.english,
    chinese: sentenceItem.chinese,
    week: sentenceItem.week,
    theme: sentenceItem.theme,
    type: 'sentence',
  }
}

/**
 * Convert sentence items into FillBlank-compatible data.
 * Each sentence becomes one multi-blank entry.
 */
function sentencesToFillBlanks(sentenceItems) {
  const result = []
  for (const s of sentenceItems) {
    const entry = sentenceToFillBlank(s)
    if (entry) result.push(entry)
  }
  return result
}

/**
 * Extract the vocabulary words to hide from a sentence.
 */
function getVocabWordsForSentence(sentence) {
  return findVocabInSentence(sentence).map(m => m.word)
}

export { findVocabInSentence, sentencesToFillBlanks, getVocabWordsForSentence, sentenceToFillBlank }

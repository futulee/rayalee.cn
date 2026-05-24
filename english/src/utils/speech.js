const BASE = import.meta.env.VITE_API_URL ?? ''
let audioEl = null

function getAudio() {
  if (!audioEl) audioEl = new Audio()
  return audioEl
}

export function speak(text, rate = 0.85) {
  // Try speechSynthesis first
  if (window.speechSynthesis) {
    try {
      window.speechSynthesis.cancel()
      const u = new SpeechSynthesisUtterance(text)
      u.lang = 'en-US'
      u.rate = rate
      u.pitch = 1.05
      window.speechSynthesis.speak(u)
      return
    } catch { /* fall through to TTS */ }
  }

  // Fallback: TTS via our own Worker proxy (works on restricted devices)
  const url = `${BASE}/api/tts?text=${encodeURIComponent(text)}`
  try {
    const audio = getAudio()
    audio.src = url
    audio.play().catch(() => {})
  } catch { /* ignore */ }
}

export function stopSpeaking() {
  if (window.speechSynthesis) {
    try { window.speechSynthesis.cancel() } catch {}
  }
  if (audioEl) {
    try { audioEl.pause(); audioEl.currentTime = 0 } catch {}
  }
}

export function playErrorSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.type = 'square'
    osc.frequency.setValueAtTime(200, ctx.currentTime)
    osc.frequency.setValueAtTime(150, ctx.currentTime + 0.1)
    gain.gain.setValueAtTime(0.15, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.3)
  } catch { /* ignore */ }
}

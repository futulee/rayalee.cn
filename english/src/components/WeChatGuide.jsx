import { useState, useEffect } from 'react'

export default function WeChatGuide() {
  const [showGuide, setShowGuide] = useState(false)
  const [checking, setChecking] = useState(true)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const ua = navigator.userAgent.toLowerCase()
    if (!ua.includes('micromessenger')) {
      setChecking(false)
      return
    }

    // Only show once per session, even across pages
    if (sessionStorage.getItem('wx_guide_dismissed')) {
      setChecking(false)
      return
    }

    // Try to reach our API — if it works, the site is accessible in WeChat
    const BASE = import.meta.env.VITE_API_URL ?? ''
    fetch(`${BASE}/api/leaderboard`, { signal: AbortSignal.timeout(5000) })
      .then(res => {
        if (!res.ok) setShowGuide(true)
        setChecking(false)
      })
      .catch(() => {
        // API unreachable — likely blocked by WeChat
        setShowGuide(true)
        setChecking(false)
      })
  }, [])

  const handleDismiss = () => {
    sessionStorage.setItem('wx_guide_dismissed', '1')
    setShowGuide(false)
  }

  if (checking || !showGuide) return null

  const url = window.location.href

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { /* manual copy fallback */ }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', zIndex: 9999, padding: 24,
      color: 'white', textAlign: 'center', fontFamily: 'system-ui, sans-serif',
    }}>
      <div style={{ fontSize: 52, marginBottom: 16 }}>📋</div>
      <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>复制链接到浏览器打开</div>
      <div style={{ fontSize: 14, opacity: 0.75, lineHeight: 1.8, marginBottom: 20 }}>
        微信内暂时无法直接使用<br />请复制下方链接，粘贴到 Safari 打开
      </div>
      <div style={{
        background: 'rgba(255,255,255,0.12)', borderRadius: 12,
        padding: '12px 16px', fontSize: 12, opacity: 0.85,
        marginBottom: 16, maxWidth: 320, wordBreak: 'break-all', lineHeight: 1.5,
      }}>
        {url}
      </div>
      <button onClick={handleCopy} style={{
        background: copied ? '#34C759' : 'rgba(255,255,255,0.25)',
        border: 'none', color: 'white', borderRadius: 10,
        padding: '12px 32px', fontSize: 16, fontWeight: 700, cursor: 'pointer',
        marginBottom: 12, transition: 'background 0.2s',
      }}>
        {copied ? '已复制！去 Safari 粘贴打开 ✅' : '📋 复制链接'}
      </button>
      <button onClick={handleDismiss} style={{
        background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)',
        fontSize: 13, cursor: 'pointer', padding: 8,
      }}>
        知道了，我自己打开
      </button>
    </div>
  )
}

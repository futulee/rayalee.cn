import { useState, useEffect } from 'react'
import { loadCreds, wasLogout, clearLogoutFlag } from '../utils/storage.js'

export default function Login({ onLogin }) {
  const [nickname, setNickname] = useState('')
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const saved = loadCreds()
    if (saved?.nickname) {
      setNickname(saved.nickname)
      if (saved.pin) {
        setPin(saved.pin)
        // After logout: pre-fill but don't auto-login
        if (wasLogout()) return
        // Fresh visit with saved creds: auto-login
        clearLogoutFlag()
        setLoading(true)
        onLogin(saved.nickname, saved.pin).catch(err => {
          setError(err.message || '自动登录失败，请重新输入')
          setLoading(false)
        })
      }
    }
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!nickname.trim()) return setError('请输入你的名字')
    if (pin.length !== 4) return setError('密码必须是4位数字')
    setLoading(true)
    setError('')
    try {
      clearLogoutFlag()
      await onLogin(nickname.trim(), pin)
    } catch (err) {
      setError(err.message || '登录失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-screen">
      <div className="login-hero">🌟</div>
      <h1 className="login-title">Raya的英语探险家</h1>
      <p className="login-subtitle">每天一点点，英语变超棒！</p>

      <form className="login-card" onSubmit={handleSubmit}>
        <div className="input-group">
          <label>你的名字</label>
          <input
            className="input-field"
            type="text"
            placeholder="比如：小美、小明"
            value={nickname}
            onChange={e => setNickname(e.target.value)}
            maxLength={12}
            autoComplete="off"
          />
        </div>
        <div className="input-group">
          <label>4位密码</label>
          <input
            className="input-field pin"
            type="password"
            inputMode="numeric"
            pattern="[0-9]*"
            placeholder="1234"
            value={pin}
            onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
          />
        </div>
        {error && <p className="login-error">{error}</p>}
        <button
          className="btn btn-primary"
          type="submit"
          disabled={loading}
        >
          {loading ? '进入中…' : '开始冒险！🚀'}
        </button>
      </form>
      <p style={{ fontSize: 12, color: '#ADB5BD', marginTop: 12, textAlign: 'center' }}>
        新用户直接输入名字和密码即可注册
      </p>
      <p className="footer-credit">Made by 李丛雅 Raya @ 深圳湾学校</p>
    </div>
  )
}

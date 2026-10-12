import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { BrandMark } from '../components/BrandMark'
import { authService } from '../services/authService'

function UserFieldIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="8" r="3.25" stroke="currentColor" strokeWidth="1.6" />
      <path d="M5.5 19.2c.9-3.2 3.4-5 6.5-5s5.6 1.8 6.5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

function LockFieldIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="6" y="10" width="12" height="10" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M9 10V8a3 3 0 016 0v2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

function EyeIcon({ off }: { off?: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M2.8 12S6.2 6.5 12 6.5 21.2 12 21.2 12 17.8 17.5 12 17.5 2.8 12 2.8 12z"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <circle cx="12" cy="12" r="2.4" stroke="currentColor" strokeWidth="1.6" />
      {off && <path d="M4 20L20 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />}
    </svg>
  )
}

export function LoginPage() {
  const navigate = useNavigate()
  const [userId, setUserId] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (authService.isAuthenticated()) {
    return <Navigate to="/enquiries" replace />
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError('')
    if (!userId.trim() || !password) {
      setError('Username and password are required.')
      return
    }
    setLoading(true)
    try {
      const result = await authService.login(userId, password, rememberMe)
      if (!result.ok) {
        setError(result.message ?? 'Invalid username or password.')
        return
      }
      navigate('/enquiries', { replace: true })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-brand">
          <BrandMark />
        </div>
        <p className="auth-lead">Sign in to Hilton Inquiries.</p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div>
            <label className="auth-label" htmlFor="userId">
              Username
            </label>
            <div className="auth-input-wrap">
              <span className="auth-input-icon">
                <UserFieldIcon />
              </span>
              <input
                id="userId"
                className="auth-input"
                autoComplete="username"
                placeholder="admin"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                required
              />
            </div>
          </div>

          <div>
            <label className="auth-label" htmlFor="password">
              Password
            </label>
            <div className="auth-input-wrap">
              <span className="auth-input-icon">
                <LockFieldIcon />
              </span>
              <input
                id="password"
                className="auth-input auth-input-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="auth-toggle-pw"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                onClick={() => setShowPassword((v) => !v)}
              >
                <EyeIcon off={showPassword} />
              </button>
            </div>
          </div>

          <label className="auth-check-row">
            <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} />
            Remember me
          </label>

          {error && <p className="auth-error">{error}</p>}

          <button type="submit" className="auth-submit" disabled={loading}>
            {loading ? 'Signing in…' : 'Continue'}
            {!loading && <span aria-hidden="true">→</span>}
          </button>
        </form>
      </div>
    </div>
  )
}

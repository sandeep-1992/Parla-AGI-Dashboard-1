import { useEffect, useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { BrandMark } from '../components/BrandMark'
import { authService } from '../services/authService'
import { fetchTenant, tenantPath } from '../services/tenantService'
import type { TenantInfo } from '../types/tenant'

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

export function LoginPage({ tenantSlug }: { tenantSlug: string }) {
  const navigate = useNavigate()
  const [tenant, setTenant] = useState<TenantInfo | null>(null)
  const [missing, setMissing] = useState(false)
  const [userId, setUserId] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [bootstrapping, setBootstrapping] = useState(true)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      setBootstrapping(true)
      setMissing(false)
      const current = await fetchTenant(tenantSlug)
      if (cancelled) return
      setTenant(current)
      setMissing(!current)
      setBootstrapping(false)
    })()
    return () => {
      cancelled = true
    }
  }, [tenantSlug])

  const session = authService.getSession()
  if (session?.user.tenantSlug === tenantSlug) {
    return <Navigate to={tenantPath(session.user.tenantSlug, '/enquiries')} replace />
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
      const result = await authService.login(userId, password, rememberMe, tenantSlug)
      if (!result.ok) {
        setError(result.message ?? 'Invalid username or password.')
        return
      }
      navigate(tenantPath(result.tenantSlug || tenantSlug, '/enquiries'), { replace: true })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-brand">
          <BrandMark tenant={tenant} />
        </div>
        <p className="auth-lead">
          {bootstrapping
            ? 'Loading portal…'
            : missing
              ? 'This customer portal was not found or is disabled.'
              : `Sign in to ${tenant?.productName ?? 'Inquiries'}.`}
        </p>

        {!missing && (
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
                  disabled={bootstrapping}
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
                  disabled={bootstrapping}
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

            <button type="submit" className="auth-submit" disabled={loading || bootstrapping || !tenant}>
              {loading ? 'Signing in…' : 'Continue'}
              {!loading && <span aria-hidden="true">→</span>}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

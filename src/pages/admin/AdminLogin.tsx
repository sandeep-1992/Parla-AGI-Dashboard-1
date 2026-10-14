import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { platformAuthService } from '../../services/platformAuthService'

export function AdminLoginPage() {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (platformAuthService.isAuthenticated()) {
    return <Navigate to="/admin" replace />
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError('')
    setLoading(true)
    try {
      const result = await platformAuthService.login(username, password)
      if (!result.ok) {
        setError(result.message ?? 'Invalid credentials.')
        return
      }
      navigate('/admin', { replace: true })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page admin-auth">
      <div className="auth-card">
        <div className="admin-brand">
          <p className="admin-eyebrow">Parla-Ai</p>
          <h1 className="admin-title">Parla-Ai Customers</h1>
          <p className="auth-lead">Sign in to create and manage customer portals.</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div>
            <label className="auth-label" htmlFor="admin-user">
              Platform username
            </label>
            <div className="auth-input-wrap">
              <input
                id="admin-user"
                className="auth-input auth-input-plain"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
          </div>

          <div>
            <label className="auth-label" htmlFor="admin-password">
              Platform password
            </label>
            <div className="auth-input-wrap">
              <input
                id="admin-password"
                className="auth-input auth-input-plain"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          {error && <p className="auth-error">{error}</p>}

          <button type="submit" className="auth-submit" disabled={loading}>
            {loading ? 'Signing in…' : 'Open console'}
          </button>
        </form>
      </div>
    </div>
  )
}

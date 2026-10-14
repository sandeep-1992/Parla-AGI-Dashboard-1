const STORAGE_KEY = 'platform.admin.session'

type PlatformSession = {
  token: string
  user: string
  loggedInAt: string
}

let memory: PlatformSession | null = readSession()

function readSession(): PlatformSession | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as PlatformSession
    if (!parsed?.token) return null
    return parsed
  } catch {
    return null
  }
}

function persist(session: PlatformSession | null) {
  memory = session
  if (!session) {
    sessionStorage.removeItem(STORAGE_KEY)
    return
  }
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session))
}

export const platformAuthService = {
  isAuthenticated(): boolean {
    return memory !== null
  },

  getToken(): string | null {
    return memory?.token ?? null
  },

  getUser(): string | null {
    return memory?.user ?? null
  },

  async login(username: string, password: string): Promise<{ ok: boolean; message?: string }> {
    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password }),
      })
      const body = (await response.json().catch(() => ({}))) as {
        ok?: boolean
        token?: string
        user?: string
        message?: string
      }
      if (!response.ok || !body.ok || !body.token) {
        return { ok: false, message: body.message ?? 'Invalid platform credentials.' }
      }
      persist({
        token: body.token,
        user: body.user ?? username.trim(),
        loggedInAt: new Date().toISOString(),
      })
      return { ok: true }
    } catch {
      return { ok: false, message: 'Unable to sign in.' }
    }
  },

  logout(): void {
    persist(null)
  },

  authHeaders(): HeadersInit {
    const token = memory?.token
    return token ? { Authorization: `Bearer ${token}` } : {}
  },
}

import type { AuthSession, AuthUser } from '../types/auth'

const STORAGE_KEY = 'sales-enquiry-portal.session'

let memorySession: AuthSession | null = readStoredSession()

function readStoredSession(): AuthSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY) ?? sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as AuthSession
    if (!parsed?.user?.userId) return null
    return parsed
  } catch {
    return null
  }
}

function persistSession(session: AuthSession | null, remember: boolean): void {
  memorySession = session
  localStorage.removeItem(STORAGE_KEY)
  sessionStorage.removeItem(STORAGE_KEY)
  if (!session) return
  const raw = JSON.stringify(session)
  if (remember) localStorage.setItem(STORAGE_KEY, raw)
  else sessionStorage.setItem(STORAGE_KEY, raw)
}

export const authService = {
  isAuthenticated(): boolean {
    return memorySession !== null
  },

  getCurrentUser(): AuthUser | null {
    return memorySession?.user ?? null
  },

  async login(
    userId: string,
    password: string,
    rememberMe = false,
  ): Promise<{ ok: boolean; message?: string }> {
    const trimmedUserId = userId.trim()
    if (!trimmedUserId || !password) {
      return { ok: false, message: 'Username and password are required.' }
    }

    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: trimmedUserId, password }),
      })
      const body = (await response.json().catch(() => ({}))) as {
        ok?: boolean
        userId?: string
        message?: string
      }
      if (!response.ok || !body.ok) {
        return { ok: false, message: body.message ?? 'Invalid username or password.' }
      }

      persistSession(
        {
          user: { userId: body.userId ?? trimmedUserId },
          loggedInAt: new Date().toISOString(),
        },
        rememberMe,
      )
      return { ok: true }
    } catch {
      return { ok: false, message: 'Unable to sign in. Please try again.' }
    }
  },

  logout(): void {
    persistSession(null, false)
  },
}

import { createHmac, timingSafeEqual } from 'node:crypto'

const TOKEN_TTL_MS = 1000 * 60 * 60 * 12 // 12 hours

function adminUser() {
  return process.env.PLATFORM_ADMIN_USER?.trim() || 'platform'
}

function adminPassword() {
  return process.env.PLATFORM_ADMIN_PASSWORD || 'PlatformAdmin'
}

function signingSecret() {
  return (
    process.env.PLATFORM_SECRET?.trim() ||
    process.env.PLATFORM_ADMIN_PASSWORD ||
    'local-platform-secret'
  )
}

function passwordsMatch(left, right) {
  const a = Buffer.from(String(left))
  const b = Buffer.from(String(right))
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

function b64url(input) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '')
}

function fromB64url(input) {
  const padded = input.replace(/-/g, '+').replace(/_/g, '/')
  const pad = padded.length % 4 === 0 ? '' : '='.repeat(4 - (padded.length % 4))
  return Buffer.from(padded + pad, 'base64').toString('utf8')
}

function sign(payloadB64) {
  return createHmac('sha256', signingSecret()).update(payloadB64).digest('base64url')
}

export function verifyPlatformLogin(username, password) {
  const userOk = passwordsMatch(String(username ?? '').trim().toLowerCase(), adminUser().toLowerCase())
  const passOk = passwordsMatch(String(password ?? ''), adminPassword())
  return userOk && passOk
}

export function issuePlatformToken() {
  const payload = b64url(
    JSON.stringify({
      role: 'platform',
      user: adminUser(),
      exp: Date.now() + TOKEN_TTL_MS,
    }),
  )
  return `${payload}.${sign(payload)}`
}

export function verifyPlatformToken(token) {
  const raw = String(token ?? '').trim()
  const [payload, signature] = raw.split('.')
  if (!payload || !signature) return null
  const expected = sign(payload)
  try {
    const a = Buffer.from(signature)
    const b = Buffer.from(expected)
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null
  } catch {
    return null
  }
  try {
    const data = JSON.parse(fromB64url(payload))
    if (data?.role !== 'platform' || typeof data.exp !== 'number' || data.exp < Date.now()) {
      return null
    }
    return data
  } catch {
    return null
  }
}

export function readPlatformAuth(req) {
  const header = String(req.headers?.authorization ?? '')
  if (header.startsWith('Bearer ')) {
    return verifyPlatformToken(header.slice(7))
  }
  return null
}

export function requirePlatformAuth(req, res) {
  const session = readPlatformAuth(req)
  if (!session) {
    res.statusCode = 401
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ error: 'Unauthorized' }))
    return null
  }
  return session
}

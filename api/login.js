import { timingSafeEqual } from 'node:crypto'

const DEFAULT_USER = 'admin'
const DEFAULT_PASSWORD = 'Hilton'

function passwordsMatch(left, right) {
  const a = Buffer.from(String(left))
  const b = Buffer.from(String(right))
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', (chunk) => chunks.push(chunk))
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8').trim()
      if (!raw) {
        resolve({})
        return
      }
      try {
        resolve(JSON.parse(raw))
      } catch (error) {
        reject(error)
      }
    })
    req.on('error', reject)
  })
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.statusCode = 405
    res.setHeader('Allow', 'POST')
    res.end(JSON.stringify({ ok: false, message: 'Method not allowed' }))
    return
  }

  const username = process.env.AUTH_USERNAME?.trim() || DEFAULT_USER
  const password = process.env.AUTH_PASSWORD || DEFAULT_PASSWORD

  try {
    const body = req.body && typeof req.body === 'object' ? req.body : await readBody(req)
    const userId = String(body.userId ?? body.username ?? '').trim()
    const submitted = String(body.password ?? '')

    if (!userId || !submitted) {
      res.statusCode = 400
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ ok: false, message: 'Username and password are required.' }))
      return
    }

    if (userId.toLowerCase() !== username.toLowerCase() || !passwordsMatch(submitted, password)) {
      res.statusCode = 401
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ ok: false, message: 'Invalid username or password.' }))
      return
    }

    res.statusCode = 200
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ ok: true, userId: username }))
  } catch {
    res.statusCode = 400
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ ok: false, message: 'Unable to sign in. Please try again.' }))
  }
}

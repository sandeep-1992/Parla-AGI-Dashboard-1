import { issuePlatformToken, verifyPlatformLogin } from '../../lib/platformAuth.js'

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

  try {
    const body = req.body && typeof req.body === 'object' ? req.body : await readBody(req)
    const username = String(body.username ?? body.userId ?? '').trim()
    const password = String(body.password ?? '')
    if (!username || !password) {
      res.statusCode = 400
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ ok: false, message: 'Username and password are required.' }))
      return
    }
    if (!verifyPlatformLogin(username, password)) {
      res.statusCode = 401
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ ok: false, message: 'Invalid platform credentials.' }))
      return
    }
    res.statusCode = 200
    res.setHeader('Content-Type', 'application/json')
    res.end(
      JSON.stringify({
        ok: true,
        token: issuePlatformToken(),
        user: username,
      }),
    )
  } catch {
    res.statusCode = 400
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ ok: false, message: 'Unable to sign in.' }))
  }
}

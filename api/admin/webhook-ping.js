import { requirePlatformAuth } from '../../lib/platformAuth.js'

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
    res.end(JSON.stringify({ error: 'Method not allowed' }))
    return
  }
  if (!requirePlatformAuth(req, res)) return

  try {
    const body = req.body && typeof req.body === 'object' ? req.body : await readBody(req)
    const url = String(body.url ?? '').trim()
    if (!url || !/^https?:\/\//i.test(url)) {
      res.statusCode = 400
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ error: 'A valid http(s) webhook URL is required.' }))
      return
    }

    const started = Date.now()
    const upstream = await fetch(url, {
      method: 'GET',
      signal: AbortSignal.timeout(8000),
    })
    const ms = Date.now() - started
    res.statusCode = 200
    res.setHeader('Content-Type', 'application/json')
    res.end(
      JSON.stringify({
        ok: upstream.ok,
        status: upstream.status,
        ms,
      }),
    )
  } catch (error) {
    res.statusCode = 200
    res.setHeader('Content-Type', 'application/json')
    res.end(
      JSON.stringify({
        ok: false,
        ms: null,
        error: error instanceof Error ? error.message : 'Ping failed',
      }),
    )
  }
}

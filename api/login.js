import { timingSafeEqual } from 'node:crypto'
import { publicCustomer, resolveCustomer } from '../lib/customers.js'

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

  try {
    const body = req.body && typeof req.body === 'object' ? req.body : await readBody(req)
    const userId = String(body.userId ?? body.username ?? '').trim()
    const submitted = String(body.password ?? '')
    const tenantSlug = String(body.tenant ?? body.tenantSlug ?? '').trim()

    if (!userId || !submitted) {
      res.statusCode = 400
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ ok: false, message: 'Username and password are required.' }))
      return
    }

    if (!tenantSlug) {
      res.statusCode = 400
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ ok: false, message: 'Customer portal is required.' }))
      return
    }

    const tenant = await resolveCustomer({
      slug: tenantSlug,
      host: req.headers.host,
    })
    if (!tenant) {
      res.statusCode = 404
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ ok: false, message: 'Customer portal not found or disabled.' }))
      return
    }

    if (userId.toLowerCase() !== tenant.username.toLowerCase() || !passwordsMatch(submitted, tenant.password)) {
      res.statusCode = 401
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ ok: false, message: 'Invalid username or password.' }))
      return
    }

    res.statusCode = 200
    res.setHeader('Content-Type', 'application/json')
    res.end(
      JSON.stringify({
        ok: true,
        userId: tenant.username,
        tenant: publicCustomer(tenant),
      }),
    )
  } catch {
    res.statusCode = 400
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ ok: false, message: 'Unable to sign in. Please try again.' }))
  }
}

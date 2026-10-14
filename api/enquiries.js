import { resolveCustomer } from '../lib/customers.js'
import { fetchWithRetry, formatUpstreamError } from '../lib/upstream.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.statusCode = 405
    res.setHeader('Allow', 'GET')
    res.end(JSON.stringify({ error: 'Method not allowed' }))
    return
  }

  const tenant = await resolveCustomer({
    slug: String(req.query?.tenant ?? ''),
    host: req.headers.host,
  })
  if (!tenant) {
    res.statusCode = 404
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ error: 'Customer portal not found' }))
    return
  }

  try {
    const upstream = await fetchWithRetry(tenant.webhookUrl, { method: 'GET' })
    const text = await upstream.text()
    res.setHeader('Content-Type', 'application/json')

    if (!upstream.ok) {
      res.statusCode = upstream.status
      res.end(
        JSON.stringify({
          error: text.slice(0, 400) || `Enquiry fetch failed (${upstream.status})`,
        }),
      )
      return
    }

    if (!text.trim()) {
      res.statusCode = 200
      res.end(JSON.stringify({ count: 0, enquiries: [], tenant: tenant.slug }))
      return
    }

    try {
      const parsed = JSON.parse(text)
      res.statusCode = 200
      if (Array.isArray(parsed)) {
        res.end(JSON.stringify({ count: parsed.length, enquiries: parsed, tenant: tenant.slug }))
      } else {
        res.end(
          JSON.stringify({
            ...(parsed && typeof parsed === 'object' ? parsed : {}),
            tenant: tenant.slug,
          }),
        )
      }
    } catch {
      res.statusCode = 502
      res.end(JSON.stringify({ error: 'Enquiry webhook returned invalid JSON' }))
    }
  } catch (error) {
    res.statusCode = 502
    res.setHeader('Content-Type', 'application/json')
    res.end(
      JSON.stringify({
        error: formatUpstreamError(error, 'Sales enquiry feed'),
      }),
    )
  }
}

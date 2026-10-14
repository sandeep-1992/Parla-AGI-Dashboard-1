import { publicCustomer, resolveCustomer } from '../lib/customers.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.statusCode = 405
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ error: 'Method not allowed' }))
    return
  }

  const slug = String(req.query?.slug ?? '').trim()
  res.setHeader('Content-Type', 'application/json')

  if (!slug) {
    res.statusCode = 400
    res.end(JSON.stringify({ error: 'slug is required' }))
    return
  }

  const tenant = await resolveCustomer({
    slug,
    host: req.headers.host,
  })
  if (!tenant || tenant.slug !== slug.toLowerCase()) {
    res.statusCode = 404
    res.end(JSON.stringify({ error: 'Customer portal not found' }))
    return
  }

  res.statusCode = 200
  res.end(JSON.stringify({ tenant: publicCustomer(tenant) }))
}

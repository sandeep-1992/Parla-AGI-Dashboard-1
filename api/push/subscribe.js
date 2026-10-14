import { resolveCustomer } from '../../lib/customers.js'
import { addPushSubscription } from '../../lib/push.js'
import { hasDurablePushStore } from '../../lib/pushStore.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.statusCode = 405
    res.end(JSON.stringify({ error: 'Method not allowed' }))
    return
  }

  try {
    const chunks = []
    for await (const chunk of req) chunks.push(chunk)
    const raw = Buffer.concat(chunks).toString('utf8')
    const body = raw.trim() ? JSON.parse(raw) : {}
    const tenant = await resolveCustomer({
      slug: String(body.tenantId ?? body.tenant ?? ''),
      host: req.headers.host,
    })
    if (!tenant) {
      res.statusCode = 404
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ error: 'Customer portal not found' }))
      return
    }

    const count = await addPushSubscription(body.subscription ?? body, tenant.id)
    res.statusCode = 200
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ ok: true, count, tenant: tenant.slug, durable: hasDurablePushStore() }))
  } catch (error) {
    res.statusCode = 400
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ error: error instanceof Error ? error.message : 'Could not save subscription' }))
  }
}

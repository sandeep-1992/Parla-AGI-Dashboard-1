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
    const count = await addPushSubscription(body.subscription ?? body)
    res.statusCode = 200
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ ok: true, count, durable: hasDurablePushStore() }))
  } catch (error) {
    res.statusCode = 400
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ error: error instanceof Error ? error.message : 'Could not save subscription' }))
  }
}

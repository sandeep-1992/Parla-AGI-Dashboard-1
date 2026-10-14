import { dispatchNewEnquiryPushes } from '../../lib/push.js'

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.statusCode = 405
    res.end(JSON.stringify({ error: 'Method not allowed' }))
    return
  }

  const secret = process.env.CRON_SECRET?.trim()
  const auth = String(req.headers.authorization ?? '')
  const querySecret = String(req.query?.secret ?? '')
  if (secret && auth !== `Bearer ${secret}` && querySecret !== secret) {
    res.statusCode = 401
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ error: 'Unauthorized' }))
    return
  }

  try {
    const result = await dispatchNewEnquiryPushes()
    res.statusCode = 200
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ ok: true, ...result }))
  } catch (error) {
    res.statusCode = 502
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ error: error instanceof Error ? error.message : 'Push dispatch failed' }))
  }
}

import { fetchWithRetry, formatUpstreamError } from '../lib/upstream.js'

const DEFAULT_WEBHOOK = 'https://engine.auriforce.com/webhook/fetch-sales-enquiry'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.statusCode = 405
    res.setHeader('Allow', 'GET')
    res.end(JSON.stringify({ error: 'Method not allowed' }))
    return
  }

  const webhookUrl = process.env.SALES_ENQUIRY_WEBHOOK_URL?.trim() || DEFAULT_WEBHOOK

  try {
    const upstream = await fetchWithRetry(webhookUrl, { method: 'GET' })
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
      res.end(JSON.stringify({ count: 0, enquiries: [] }))
      return
    }

    try {
      res.statusCode = 200
      res.end(JSON.stringify(JSON.parse(text)))
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

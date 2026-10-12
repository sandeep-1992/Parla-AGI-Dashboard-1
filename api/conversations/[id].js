import { fetchWithRetry, formatUpstreamError } from '../../lib/upstream.js'

const ELEVENLABS_BASE = 'https://api.elevenlabs.io/v1/convai'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.statusCode = 405
    res.setHeader('Allow', 'GET')
    res.end(JSON.stringify({ error: 'Method not allowed' }))
    return
  }

  const conversationId = String(req.query.id ?? '').trim()
  const apiKey = process.env.ELEVENLABS_API_KEY?.trim() ?? ''
  if (!conversationId) {
    res.statusCode = 400
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ error: 'Conversation ID is required.' }))
    return
  }
  if (!apiKey) {
    res.statusCode = 503
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ error: 'Voice conversation API is not configured.' }))
    return
  }

  try {
    const upstream = await fetchWithRetry(
      `${ELEVENLABS_BASE}/conversations/${encodeURIComponent(conversationId)}`,
      { headers: { 'xi-api-key': apiKey } },
    )
    const text = await upstream.text()
    res.statusCode = upstream.ok ? 200 : upstream.status
    res.setHeader('Content-Type', 'application/json')
    res.end(upstream.ok ? text : JSON.stringify({ error: text.slice(0, 400) || 'Conversation fetch failed' }))
  } catch (error) {
    res.statusCode = 502
    res.setHeader('Content-Type', 'application/json')
    res.end(
      JSON.stringify({
        error: formatUpstreamError(error, 'Conversation audio and transcript'),
      }),
    )
  }
}

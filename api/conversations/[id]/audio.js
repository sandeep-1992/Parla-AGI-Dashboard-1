import { fetchWithRetry, formatUpstreamError } from '../../../lib/upstream.js'

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
  if (!conversationId || !apiKey) {
    res.statusCode = conversationId ? 503 : 400
    res.setHeader('Content-Type', 'application/json')
    res.end(
      JSON.stringify({
        error: conversationId
          ? 'Voice conversation API is not configured.'
          : 'Conversation ID is required.',
      }),
    )
    return
  }

  try {
    const upstream = await fetchWithRetry(
      `${ELEVENLABS_BASE}/conversations/${encodeURIComponent(conversationId)}/audio`,
      { headers: { 'xi-api-key': apiKey } },
    )
    if (!upstream.ok) {
      const text = await upstream.text()
      res.statusCode = upstream.status
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ error: text.slice(0, 400) || 'Audio fetch failed' }))
      return
    }

    const buffer = Buffer.from(await upstream.arrayBuffer())
    res.statusCode = 200
    res.setHeader('Content-Type', upstream.headers.get('content-type') ?? 'audio/mpeg')
    res.setHeader('Cache-Control', 'private, max-age=3600')
    res.end(buffer)
  } catch (error) {
    res.statusCode = 502
    res.setHeader('Content-Type', 'application/json')
    res.end(
      JSON.stringify({
        error: formatUpstreamError(error, 'Conversation audio'),
      }),
    )
  }
}

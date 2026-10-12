import { timingSafeEqual } from 'node:crypto'
import type { IncomingMessage, ServerResponse } from 'node:http'
import path from 'node:path'
import { defineConfig, loadEnv, type Connect, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { fetchWithRetry, formatUpstreamError } from './lib/upstream.js'

const DEFAULT_WEBHOOK = 'https://engine.auriforce.com/webhook/fetch-sales-enquiry'
const DEFAULT_USER = 'admin'
const DEFAULT_PASSWORD = 'auriforce'
const ELEVENLABS_BASE = 'https://api.elevenlabs.io/v1/convai'

function json(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(body))
}

function readJsonBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on('data', (chunk) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)))
    })
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8').trim()
      if (!raw) {
        resolve({})
        return
      }
      try {
        resolve(JSON.parse(raw) as Record<string, unknown>)
      } catch {
        reject(new Error('Invalid JSON'))
      }
    })
    req.on('error', reject)
  })
}

function passwordsMatch(left: string, right: string): boolean {
  const a = Buffer.from(left)
  const b = Buffer.from(right)
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

function salesApiPlugin(env: Record<string, string>): Plugin {
  const webhookUrl = env.SALES_ENQUIRY_WEBHOOK_URL?.trim() || DEFAULT_WEBHOOK
  const username = env.AUTH_USERNAME?.trim() || DEFAULT_USER
  const password = env.AUTH_PASSWORD || DEFAULT_PASSWORD
  const elevenLabsKey = env.ELEVENLABS_API_KEY?.trim() || ''

  function attachApi(server: { middlewares: Connect.Server }) {
    server.middlewares.use((req, res, next) => {
      void (async () => {
        const url = req.url?.split('?')[0] ?? ''

        if (req.method === 'POST' && url === '/api/login') {
          try {
            const body = await readJsonBody(req)
            const userId = String(body.userId ?? body.username ?? '').trim()
            const submitted = String(body.password ?? '')
            if (!userId || !submitted) {
              json(res, 400, { ok: false, message: 'Username and password are required.' })
              return
            }
            if (userId.toLowerCase() !== username.toLowerCase() || !passwordsMatch(submitted, password)) {
              json(res, 401, { ok: false, message: 'Invalid username or password.' })
              return
            }
            json(res, 200, { ok: true, userId: username })
          } catch {
            json(res, 400, { ok: false, message: 'Unable to sign in. Please try again.' })
          }
          return
        }

        const conversationMatch = url.match(/^\/api\/conversations\/([^/]+)(?:\/(audio))?$/)
        if (req.method === 'GET' && conversationMatch) {
          const conversationId = decodeURIComponent(conversationMatch[1] ?? '')
          const audio = conversationMatch[2] === 'audio'
          if (!conversationId) {
            json(res, 400, { error: 'Conversation ID is required.' })
            return
          }
          if (!elevenLabsKey) {
            json(res, 503, {
              error: 'Voice conversation API is not configured. Add ELEVENLABS_API_KEY and restart.',
            })
            return
          }
          try {
            const upstream = await fetchWithRetry(
              `${ELEVENLABS_BASE}/conversations/${encodeURIComponent(conversationId)}${audio ? '/audio' : ''}`,
              { headers: { 'xi-api-key': elevenLabsKey } },
            )
            if (audio) {
              if (!upstream.ok) {
                const text = await upstream.text()
                json(res, upstream.status, {
                  error: text.slice(0, 400) || `Audio fetch failed (${upstream.status})`,
                })
                return
              }
              const buffer = Buffer.from(await upstream.arrayBuffer())
              res.statusCode = 200
              res.setHeader('Content-Type', upstream.headers.get('content-type') ?? 'audio/mpeg')
              res.setHeader('Cache-Control', 'private, max-age=3600')
              res.end(buffer)
              return
            }

            const text = await upstream.text()
            if (!upstream.ok) {
              json(res, upstream.status, {
                error: text.slice(0, 400) || `Conversation fetch failed (${upstream.status})`,
              })
              return
            }
            res.statusCode = 200
            res.setHeader('Content-Type', 'application/json')
            res.end(text)
          } catch (error) {
            json(res, 502, {
              error: formatUpstreamError(error, 'Conversation audio and transcript'),
            })
          }
          return
        }

        if (req.method === 'GET' && url === '/api/enquiries') {
          try {
            const upstream = await fetchWithRetry(webhookUrl, { method: 'GET' })
            const text = await upstream.text()
            if (!upstream.ok) {
              json(res, upstream.status, {
                error: text.slice(0, 400) || `Enquiry fetch failed (${upstream.status})`,
              })
              return
            }
            if (!text.trim()) {
              json(res, 200, { count: 0, enquiries: [] })
              return
            }
            try {
              const parsed = JSON.parse(text) as unknown
              res.statusCode = 200
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify(parsed))
            } catch {
              json(res, 502, { error: 'Enquiry webhook returned invalid JSON' })
            }
          } catch (error) {
            json(res, 502, {
              error: formatUpstreamError(error, 'Sales enquiry feed'),
            })
          }
          return
        }

        next()
      })()
    })
  }

  return {
    name: 'sales-enquiry-api',
    enforce: 'pre',
    configureServer: attachApi,
    configurePreviewServer: attachApi,
  }
}

export default defineConfig(({ mode }) => {
  const env = {
    ...loadEnv(mode, path.resolve(process.cwd(), '..', 'outbound-ai-manager'), ''),
    ...loadEnv(mode, process.cwd(), ''),
  }
  return {
    plugins: [react(), salesApiPlugin(env)],
    server: {
      host: '127.0.0.1',
      port: 5174,
      strictPort: false,
      open: '/login',
    },
    preview: {
      host: '127.0.0.1',
      port: 4174,
    },
  }
})

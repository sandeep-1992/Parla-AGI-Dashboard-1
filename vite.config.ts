import { timingSafeEqual } from 'node:crypto'
import type { IncomingMessage, ServerResponse } from 'node:http'
import path from 'node:path'
import { defineConfig, loadEnv, type Connect, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import {
  adminCustomer,
  createCustomer,
  deleteCustomer,
  hasDurableCustomerStore,
  listCustomers,
  publicCustomer,
  resolveCustomer,
  updateCustomer,
} from './lib/customers.js'
import {
  issuePlatformToken,
  requirePlatformAuth,
  verifyPlatformLogin,
} from './lib/platformAuth.js'
import { addPushSubscription, dispatchNewEnquiryPushes, getVapidPublicKey } from './lib/push.js'
import { fetchWithRetry, formatUpstreamError } from './lib/upstream.js'

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

function queryParam(reqUrl: string | undefined, key: string): string {
  try {
    const u = new URL(reqUrl ?? '', 'http://localhost')
    return u.searchParams.get(key) ?? ''
  } catch {
    return ''
  }
}

function pathParam(url: string, prefix: string): string | null {
  if (!url.startsWith(prefix)) return null
  const rest = url.slice(prefix.length)
  const id = rest.split('/')[0]
  return id ? decodeURIComponent(id) : null
}

function salesApiPlugin(): Plugin {
  const elevenLabsKey = () => process.env.ELEVENLABS_API_KEY?.trim() || ''

  function attachApi(server: { middlewares: Connect.Server }) {
    server.middlewares.use((req, res, next) => {
      void (async () => {
        const url = req.url?.split('?')[0] ?? ''
        const host = req.headers.host

        if (req.method === 'POST' && url === '/api/admin/login') {
          try {
            const body = await readJsonBody(req)
            const username = String(body.username ?? body.userId ?? '').trim()
            const password = String(body.password ?? '')
            if (!username || !password) {
              json(res, 400, { ok: false, message: 'Username and password are required.' })
              return
            }
            if (!verifyPlatformLogin(username, password)) {
              json(res, 401, { ok: false, message: 'Invalid platform credentials.' })
              return
            }
            json(res, 200, { ok: true, token: issuePlatformToken(), user: username })
          } catch {
            json(res, 400, { ok: false, message: 'Unable to sign in.' })
          }
          return
        }

        if (req.method === 'POST' && url === '/api/admin/webhook-ping') {
          if (!requirePlatformAuth(req, res)) return
          try {
            const body = await readJsonBody(req)
            const pingUrl = String(body.url ?? '').trim()
            if (!pingUrl || !/^https?:\/\//i.test(pingUrl)) {
              json(res, 400, { error: 'A valid http(s) webhook URL is required.' })
              return
            }
            const started = Date.now()
            try {
              const upstream = await fetch(pingUrl, {
                method: 'GET',
                signal: AbortSignal.timeout(8000),
              })
              json(res, 200, { ok: upstream.ok, status: upstream.status, ms: Date.now() - started })
            } catch (error) {
              json(res, 200, {
                ok: false,
                ms: null,
                error: error instanceof Error ? error.message : 'Ping failed',
              })
            }
          } catch {
            json(res, 400, { error: 'Invalid request' })
          }
          return
        }

        if (url === '/api/admin/customers' || url.startsWith('/api/admin/customers/')) {
          if (!requirePlatformAuth(req, res)) return

          if (req.method === 'GET' && url === '/api/admin/customers') {
            const customers = await listCustomers()
            json(res, 200, {
              customers: customers.map(adminCustomer),
              durable: hasDurableCustomerStore(),
            })
            return
          }

          if (req.method === 'POST' && url === '/api/admin/customers') {
            try {
              const body = await readJsonBody(req)
              const customer = await createCustomer(body)
              json(res, 201, { ok: true, customer: adminCustomer(customer) })
            } catch (error) {
              json(res, 400, {
                error: error instanceof Error ? error.message : 'Could not create customer',
              })
            }
            return
          }

          const id = pathParam(url, '/api/admin/customers/')
          if (id && (req.method === 'PUT' || req.method === 'PATCH')) {
            try {
              const body = await readJsonBody(req)
              const customer = await updateCustomer(id, body)
              json(res, 200, { ok: true, customer: adminCustomer(customer) })
            } catch (error) {
              const message = error instanceof Error ? error.message : 'Could not update customer'
              json(res, message === 'Customer not found.' ? 404 : 400, { error: message })
            }
            return
          }

          if (id && req.method === 'DELETE') {
            try {
              await deleteCustomer(id)
              json(res, 200, { ok: true })
            } catch (error) {
              const message = error instanceof Error ? error.message : 'Could not delete customer'
              json(res, message === 'Customer not found.' ? 404 : 400, { error: message })
            }
            return
          }
        }

        if (req.method === 'GET' && url === '/api/tenants') {
          const slug = queryParam(req.url, 'slug').trim()
          if (!slug) {
            json(res, 400, { error: 'slug is required' })
            return
          }
          const tenant = await resolveCustomer({ slug, host })
          if (!tenant || tenant.slug !== slug.toLowerCase()) {
            json(res, 404, { error: 'Customer portal not found' })
            return
          }
          json(res, 200, { tenant: publicCustomer(tenant) })
          return
        }

        if (req.method === 'POST' && url === '/api/login') {
          try {
            const body = await readJsonBody(req)
            const userId = String(body.userId ?? body.username ?? '').trim()
            const submitted = String(body.password ?? '')
            const tenantSlug = String(body.tenant ?? body.tenantSlug ?? '').trim()
            if (!userId || !submitted) {
              json(res, 400, { ok: false, message: 'Username and password are required.' })
              return
            }
            if (!tenantSlug) {
              json(res, 400, { ok: false, message: 'Customer portal is required.' })
              return
            }
            const tenant = await resolveCustomer({ slug: tenantSlug, host })
            if (!tenant) {
              json(res, 404, { ok: false, message: 'Customer portal not found or disabled.' })
              return
            }
            if (
              userId.toLowerCase() !== tenant.username.toLowerCase() ||
              !passwordsMatch(submitted, tenant.password)
            ) {
              json(res, 401, { ok: false, message: 'Invalid username or password.' })
              return
            }
            json(res, 200, { ok: true, userId: tenant.username, tenant: publicCustomer(tenant) })
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
          if (!elevenLabsKey()) {
            json(res, 503, {
              error: 'Voice conversation API is not configured. Add ELEVENLABS_API_KEY and restart.',
            })
            return
          }
          try {
            const upstream = await fetchWithRetry(
              `${ELEVENLABS_BASE}/conversations/${encodeURIComponent(conversationId)}${audio ? '/audio' : ''}`,
              { headers: { 'xi-api-key': elevenLabsKey() } },
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

        if (req.method === 'GET' && url === '/api/push/vapid') {
          json(res, 200, { publicKey: getVapidPublicKey() })
          return
        }

        if (req.method === 'POST' && url === '/api/push/subscribe') {
          try {
            const body = await readJsonBody(req)
            const tenant = await resolveCustomer({
              slug: String(body.tenantId ?? body.tenant ?? ''),
              host,
            })
            if (!tenant) {
              json(res, 404, { error: 'Customer portal not found' })
              return
            }
            const count = await addPushSubscription(body.subscription ?? body, tenant.id)
            json(res, 200, { ok: true, count, tenant: tenant.slug })
          } catch (error) {
            json(res, 400, {
              error: error instanceof Error ? error.message : 'Could not save subscription',
            })
          }
          return
        }

        if ((req.method === 'GET' || req.method === 'POST') && url === '/api/push/dispatch') {
          try {
            const tenantSlug = queryParam(req.url, 'tenant')
            const result = await dispatchNewEnquiryPushes(tenantSlug || undefined)
            json(res, 200, { ok: true, ...result })
          } catch (error) {
            json(res, 502, {
              error: error instanceof Error ? error.message : 'Push dispatch failed',
            })
          }
          return
        }

        if (req.method === 'GET' && url === '/api/enquiries') {
          const tenant = await resolveCustomer({
            slug: queryParam(req.url, 'tenant'),
            host,
          })
          if (!tenant) {
            json(res, 404, { error: 'Customer portal not found' })
            return
          }
          try {
            const upstream = await fetchWithRetry(tenant.webhookUrl, { method: 'GET' })
            const text = await upstream.text()
            if (!upstream.ok) {
              json(res, upstream.status, {
                error: text.slice(0, 400) || `Enquiry fetch failed (${upstream.status})`,
              })
              return
            }
            if (!text.trim()) {
              json(res, 200, { count: 0, enquiries: [], tenant: tenant.slug })
              return
            }
            try {
              const parsed = JSON.parse(text) as unknown
              if (Array.isArray(parsed)) {
                json(res, 200, { count: parsed.length, enquiries: parsed, tenant: tenant.slug })
              } else {
                json(res, 200, {
                  ...(parsed && typeof parsed === 'object' ? parsed : {}),
                  tenant: tenant.slug,
                })
              }
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
  for (const [key, value] of Object.entries(env)) {
    if (process.env[key] === undefined) process.env[key] = value
  }
  return {
    plugins: [react(), salesApiPlugin()],
    resolve: {
      dedupe: ['react', 'react-dom'],
    },
    server: {
      host: '127.0.0.1',
      port: 5174,
      strictPort: false,
      open: '/admin/login',
    },
    preview: {
      host: '127.0.0.1',
      port: 4174,
    },
  }
})

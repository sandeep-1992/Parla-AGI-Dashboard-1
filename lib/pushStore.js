import fs from 'node:fs/promises'
import path from 'node:path'

const FILE = path.join(process.cwd(), 'data', 'push-store.json')
const KV_KEY = 'hilton-push-store'

function emptyStore() {
  return { subscriptions: [], lastNotifiedIds: [] }
}

function asStore(value) {
  const raw = typeof value === 'string' ? JSON.parse(value) : value
  if (!raw || typeof raw !== 'object') return emptyStore()
  return {
    subscriptions: Array.isArray(raw.subscriptions) ? raw.subscriptions : [],
    lastNotifiedIds: Array.isArray(raw.lastNotifiedIds) ? raw.lastNotifiedIds : [],
  }
}

async function readKv() {
  const url = process.env.KV_REST_API_URL?.replace(/\/$/, '')
  const token = process.env.KV_REST_API_TOKEN?.trim()
  if (!url || !token) return null
  const res = await fetch(`${url}/get/${KV_KEY}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) return emptyStore()
  const body = await res.json()
  if (body.result == null) return emptyStore()
  return asStore(body.result)
}

async function writeKv(store) {
  const url = process.env.KV_REST_API_URL?.replace(/\/$/, '')
  const token = process.env.KV_REST_API_TOKEN?.trim()
  if (!url || !token) return false
  const res = await fetch(`${url}/set/${KV_KEY}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(JSON.stringify(store)),
  })
  return res.ok
}

async function readFileStore() {
  try {
    const raw = await fs.readFile(FILE, 'utf8')
    return asStore(raw)
  } catch {
    return emptyStore()
  }
}

async function writeFileStore(store) {
  await fs.mkdir(path.dirname(FILE), { recursive: true })
  await fs.writeFile(FILE, JSON.stringify(store, null, 2))
}

export async function readPushStore() {
  const kv = await readKv()
  if (kv) return kv
  return readFileStore()
}

export async function writePushStore(store) {
  const saved = await writeKv(store)
  if (!saved) await writeFileStore(store)
}

export async function saveSubscription(subscription) {
  const endpoint = String(subscription?.endpoint ?? '')
  if (!endpoint) throw new Error('Push subscription is missing an endpoint.')
  const store = await readPushStore()
  store.subscriptions = [
    subscription,
    ...store.subscriptions.filter((row) => row?.endpoint !== endpoint),
  ]
  await writePushStore(store)
  return store.subscriptions.length
}

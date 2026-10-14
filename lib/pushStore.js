import fs from 'node:fs/promises'
import path from 'node:path'
import { hasKvStore, kvRestConfig } from './kvEnv.js'

const FILE = path.join(process.cwd(), 'data', 'push-store.json')
const TMP_FILE = path.join('/tmp', 'hilton-push-store.json')
const KV_KEY = 'hilton-push-store'

function emptyTenantBucket() {
  return { subscriptions: [], lastNotifiedIds: [] }
}

function emptyStore() {
  return { tenants: {} }
}

function memoryStore() {
  if (!globalThis.__hiltonPushStore) {
    globalThis.__hiltonPushStore = emptyStore()
  }
  return globalThis.__hiltonPushStore
}

function asStore(value) {
  const raw = typeof value === 'string' ? JSON.parse(value) : value
  if (!raw || typeof raw !== 'object') return emptyStore()

  // Migrate legacy single-tenant shape.
  if (Array.isArray(raw.subscriptions) || Array.isArray(raw.lastNotifiedIds)) {
    return {
      tenants: {
        'hilton-t5': {
          subscriptions: Array.isArray(raw.subscriptions) ? raw.subscriptions : [],
          lastNotifiedIds: Array.isArray(raw.lastNotifiedIds) ? raw.lastNotifiedIds : [],
        },
      },
    }
  }

  const tenants = raw.tenants && typeof raw.tenants === 'object' ? raw.tenants : {}
  const next = { tenants: {} }
  for (const [key, bucket] of Object.entries(tenants)) {
    next.tenants[key] = {
      subscriptions: Array.isArray(bucket?.subscriptions) ? bucket.subscriptions : [],
      lastNotifiedIds: Array.isArray(bucket?.lastNotifiedIds) ? bucket.lastNotifiedIds : [],
    }
  }
  return next
}

async function readKv() {
  const kv = kvRestConfig()
  if (!kv) return null
  try {
    const res = await fetch(`${kv.url}/get/${KV_KEY}`, {
      headers: { Authorization: `Bearer ${kv.token}` },
    })
    if (!res.ok) return emptyStore()
    const body = await res.json()
    if (body.result == null) return emptyStore()
    return asStore(body.result)
  } catch {
    return null
  }
}

async function writeKv(store) {
  const kv = kvRestConfig()
  if (!kv) return false
  try {
    const res = await fetch(`${kv.url}/set/${KV_KEY}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${kv.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(JSON.stringify(store)),
    })
    return res.ok
  } catch {
    return false
  }
}

async function readFileStore() {
  for (const file of [FILE, TMP_FILE]) {
    try {
      const raw = await fs.readFile(file, 'utf8')
      return asStore(raw)
    } catch {
      // try next
    }
  }
  return asStore(memoryStore())
}

async function writeFileStore(store) {
  globalThis.__hiltonPushStore = store
  try {
    await fs.mkdir(path.dirname(FILE), { recursive: true })
    await fs.writeFile(FILE, JSON.stringify(store, null, 2))
  } catch {
    try {
      await fs.writeFile(TMP_FILE, JSON.stringify(store, null, 2))
    } catch {
      // Memory fallback only.
    }
  }
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

export function hasDurablePushStore() {
  return hasKvStore()
}

export async function readTenantPushStore(tenantId) {
  const id = String(tenantId || 'hilton-t5')
  const store = await readPushStore()
  if (!store.tenants[id]) store.tenants[id] = emptyTenantBucket()
  return { root: store, bucket: store.tenants[id], tenantId: id }
}

export async function saveSubscription(subscription, tenantId = 'hilton-t5') {
  const endpoint = String(subscription?.endpoint ?? '')
  if (!endpoint) throw new Error('Push subscription is missing an endpoint.')
  const { root, bucket } = await readTenantPushStore(tenantId)
  bucket.subscriptions = [
    subscription,
    ...bucket.subscriptions.filter((row) => row?.endpoint !== endpoint),
  ]
  await writePushStore(root)
  return bucket.subscriptions.length
}

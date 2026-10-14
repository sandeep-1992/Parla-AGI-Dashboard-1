import fs from 'node:fs/promises'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { hasKvStore, kvRestConfig } from './kvEnv.js'

const FILE = path.join(process.cwd(), 'data', 'customers.json')
const TMP_FILE = path.join('/tmp', 'platform-customers.json')
const KV_KEY = 'platform-customers'
const DEFAULT_WEBHOOK = 'https://engine.auriforce.com/webhook/fetch-sales-enquiry'

function emptyStore() {
  return { customers: [] }
}

function memoryStore() {
  if (!globalThis.__platformCustomers) {
    globalThis.__platformCustomers = emptyStore()
  }
  return globalThis.__platformCustomers
}

export function normalizeCustomer(raw, { keepId } = {}) {
  if (!raw || typeof raw !== 'object') return null
  const slug = String(raw.slug ?? raw.id ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
  if (!slug) return null
  const now = new Date().toISOString()
  return {
    id: keepId && raw.id ? String(raw.id) : String(raw.id ?? randomUUID()),
    slug,
    name: String(raw.name ?? slug).trim() || slug,
    productName: String(raw.productName ?? 'Inquiries').trim() || 'Inquiries',
    logoUrl: String(raw.logoUrl ?? '/hilton-logo.png').trim() || '/hilton-logo.png',
    username: String(raw.username ?? 'admin').trim() || 'admin',
    password: String(raw.password ?? ''),
    webhookUrl: String(raw.webhookUrl ?? DEFAULT_WEBHOOK).trim() || DEFAULT_WEBHOOK,
    enabled: raw.enabled !== false,
    createdAt: String(raw.createdAt ?? now),
    updatedAt: String(raw.updatedAt ?? now),
  }
}

function seedCustomers() {
  const sharedWebhook = process.env.SALES_ENQUIRY_WEBHOOK_URL?.trim() || DEFAULT_WEBHOOK
  const defaultUser = process.env.AUTH_USERNAME?.trim() || 'admin'
  const defaultPassword = process.env.AUTH_PASSWORD || 'Hilton'
  const now = new Date().toISOString()

  return [
    normalizeCustomer({
      id: 'hilton-t5',
      slug: 'hilton-t5',
      name: 'Hilton Heathrow Terminal 5',
      productName: 'Hilton Inquiries',
      logoUrl: '/hilton-logo.png',
      username: defaultUser,
      password: defaultPassword,
      webhookUrl: sharedWebhook,
      enabled: true,
      createdAt: now,
      updatedAt: now,
    }),
  ].filter(Boolean)
}

function asStore(value) {
  const raw = typeof value === 'string' ? JSON.parse(value) : value
  if (!raw || typeof raw !== 'object') return emptyStore()
  const list = Array.isArray(raw.customers) ? raw.customers : Array.isArray(raw) ? raw : []
  return {
    customers: list.map((row) => normalizeCustomer(row, { keepId: true })).filter(Boolean),
  }
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
  globalThis.__platformCustomers = store
  try {
    await fs.mkdir(path.dirname(FILE), { recursive: true })
    await fs.writeFile(FILE, JSON.stringify(store, null, 2))
  } catch {
    try {
      await fs.writeFile(TMP_FILE, JSON.stringify(store, null, 2))
    } catch {
      // memory only
    }
  }
}

async function readStore() {
  const kv = await readKv()
  if (kv) {
    if (kv.customers.length === 0) {
      const seeded = { customers: seedCustomers() }
      await writeKv(seeded)
      return seeded
    }
    return kv
  }
  const file = await readFileStore()
  if (file.customers.length === 0) {
    const seeded = { customers: seedCustomers() }
    await writeFileStore(seeded)
    return seeded
  }
  return file
}

async function writeStore(store) {
  const saved = await writeKv(store)
  if (!saved) await writeFileStore(store)
}

export function publicCustomer(customer) {
  if (!customer) return null
  return {
    id: customer.id,
    slug: customer.slug,
    name: customer.name,
    productName: customer.productName,
    logoUrl: customer.logoUrl,
    enabled: customer.enabled !== false,
  }
}

/** Full record for admin UI (password included so admin can edit). */
export function adminCustomer(customer) {
  if (!customer) return null
  return { ...customer }
}

export async function listCustomers({ enabledOnly = false } = {}) {
  const store = await readStore()
  const rows = store.customers
  return enabledOnly ? rows.filter((row) => row.enabled !== false) : rows
}

export async function getCustomerBySlug(slug) {
  const key = String(slug ?? '')
    .trim()
    .toLowerCase()
  if (!key) return null
  const rows = await listCustomers()
  return rows.find((row) => row.slug === key) ?? null
}

export async function getCustomerById(id) {
  const key = String(id ?? '').trim()
  if (!key) return null
  const rows = await listCustomers()
  return rows.find((row) => row.id === key) ?? null
}

export async function resolveCustomer({ slug, host, allowDisabled = false } = {}) {
  if (slug) {
    const fromSlug = await getCustomerBySlug(slug)
    if (fromSlug && (allowDisabled || fromSlug.enabled !== false)) return fromSlug
    if (fromSlug && !allowDisabled && fromSlug.enabled === false) return null
  }

  const hostname = String(host ?? '')
    .split(':')[0]
    .toLowerCase()
  if (hostname && !hostname.includes('localhost') && !hostname.endsWith('.vercel.app')) {
    const label = hostname.split('.')[0]
    if (label && label !== 'www' && label !== 'app' && label !== 'admin') {
      const fromHost = await getCustomerBySlug(label)
      if (fromHost && (allowDisabled || fromHost.enabled !== false)) return fromHost
    }
  }

  return null
}

export async function createCustomer(input) {
  const store = await readStore()
  const customer = normalizeCustomer({
    ...input,
    id: undefined,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  })
  if (!customer) throw new Error('Invalid customer.')
  if (!customer.password) throw new Error('Password is required.')
  if (store.customers.some((row) => row.slug === customer.slug)) {
    throw new Error(`Slug "${customer.slug}" is already in use.`)
  }
  store.customers.push(customer)
  await writeStore(store)
  return customer
}

export async function updateCustomer(id, input) {
  const store = await readStore()
  const index = store.customers.findIndex((row) => row.id === id)
  if (index < 0) throw new Error('Customer not found.')
  const current = store.customers[index]
  const nextSlug = String(input.slug ?? current.slug)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
  if (
    nextSlug &&
    store.customers.some((row, i) => i !== index && row.slug === nextSlug)
  ) {
    throw new Error(`Slug "${nextSlug}" is already in use.`)
  }
  const merged = normalizeCustomer(
    {
      ...current,
      ...input,
      id: current.id,
      password: input.password != null && String(input.password) !== '' ? input.password : current.password,
      createdAt: current.createdAt,
      updatedAt: new Date().toISOString(),
    },
    { keepId: true },
  )
  if (!merged) throw new Error('Invalid customer.')
  store.customers[index] = merged
  await writeStore(store)
  return merged
}

export async function deleteCustomer(id) {
  const store = await readStore()
  const next = store.customers.filter((row) => row.id !== id)
  if (next.length === store.customers.length) throw new Error('Customer not found.')
  store.customers = next
  await writeStore(store)
}

export function hasDurableCustomerStore() {
  return hasKvStore()
}

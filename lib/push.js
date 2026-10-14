import { createRequire } from 'node:module'
import path from 'node:path'
import { listTenants, resolveTenant } from './tenants.js'
import { fetchWithRetry } from './upstream.js'
import { readTenantPushStore, saveSubscription, writePushStore } from './pushStore.js'

const require = createRequire(path.join(process.cwd(), 'package.json'))
const webpush = require('web-push')

function vapidConfig() {
  const publicKey = process.env.VAPID_PUBLIC_KEY?.trim() ?? ''
  const privateKey = process.env.VAPID_PRIVATE_KEY?.trim() ?? ''
  const subject = process.env.VAPID_SUBJECT?.trim() || 'mailto:admin@localhost'
  return { publicKey, privateKey, subject }
}

export function getVapidPublicKey() {
  return vapidConfig().publicKey
}

function configureWebPush() {
  const { publicKey, privateKey, subject } = vapidConfig()
  if (!publicKey || !privateKey) {
    throw new Error('VAPID keys are not configured.')
  }
  webpush.setVapidDetails(subject, publicKey, privateKey)
}

function enquiryKey(row) {
  return String(row?.id ?? row?.conversationId ?? '')
}

function enquiryList(parsed) {
  if (Array.isArray(parsed)) return parsed
  if (parsed && Array.isArray(parsed.enquiries)) return parsed.enquiries
  if (parsed && Array.isArray(parsed.data)) return parsed.data
  return []
}

function notificationPayload(row, tenant) {
  const guest = String(row.guestName ?? '').trim() || 'New guest'
  const type = String(row.enquiryType ?? '').trim() || 'Enquiry'
  return {
    title: `New ${tenant.productName.replace(/inquiries$/i, 'inquiry')}`,
    body: `${guest} · ${type}`,
    tag: `enquiry-${enquiryKey(row)}`,
    url: `/t/${tenant.slug}/enquiries`,
  }
}

export async function addPushSubscription(subscription, tenantId) {
  configureWebPush()
  return saveSubscription(subscription, tenantId || 'hilton-t5')
}

async function dispatchForTenant(tenant) {
  configureWebPush()
  const upstream = await fetchWithRetry(tenant.webhookUrl, { method: 'GET' })
  const text = await upstream.text()
  if (!upstream.ok) {
    throw new Error(text.slice(0, 200) || `Enquiry fetch failed (${upstream.status})`)
  }
  const rows = enquiryList(text.trim() ? JSON.parse(text) : { enquiries: [] })
  const currentIds = rows.map(enquiryKey).filter(Boolean)

  const { root, bucket } = await readTenantPushStore(tenant.id)
  const previous = new Set(bucket.lastNotifiedIds)
  const isFirstSync = previous.size === 0
  const fresh = isFirstSync ? [] : rows.filter((row) => !previous.has(enquiryKey(row)))

  bucket.lastNotifiedIds = currentIds
  const stale = []
  let notified = 0

  if (fresh.length > 0 && bucket.subscriptions.length > 0) {
    const payload = JSON.stringify(
      fresh.length === 1
        ? notificationPayload(fresh[0], tenant)
        : {
            title: `New ${tenant.productName}`,
            body: `${fresh.length} new enquiries were received.`,
            tag: 'enquiry-batch',
            url: `/t/${tenant.slug}/enquiries`,
          },
    )

    for (const subscription of bucket.subscriptions) {
      try {
        await webpush.sendNotification(subscription, payload)
        notified += 1
      } catch (error) {
        const status = error?.statusCode
        if (status === 404 || status === 410) stale.push(subscription.endpoint)
      }
    }
  }

  if (stale.length > 0) {
    bucket.subscriptions = bucket.subscriptions.filter((row) => !stale.includes(row.endpoint))
  }
  await writePushStore(root)

  return {
    tenant: tenant.slug,
    notified,
    newEnquiries: fresh.length,
    firstSync: isFirstSync,
  }
}

export async function dispatchNewEnquiryPushes(tenantSlug) {
  const { publicKey, privateKey } = vapidConfig()
  if (!publicKey || !privateKey) {
    return { notified: 0, skipped: 'vapid' }
  }

  if (tenantSlug) {
    const tenant = await resolveTenant({ slug: tenantSlug })
    if (!tenant) return { notified: 0, skipped: 'tenant' }
    return dispatchForTenant(tenant)
  }

  const results = []
  let notified = 0
  for (const tenant of await listTenants()) {
    try {
      const result = await dispatchForTenant(tenant)
      results.push(result)
      notified += result.notified
    } catch (error) {
      results.push({
        tenant: tenant.slug,
        error: error instanceof Error ? error.message : 'dispatch failed',
      })
    }
  }
  return { notified, results }
}

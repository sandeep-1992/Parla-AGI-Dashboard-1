import { createRequire } from 'node:module'
import path from 'node:path'
import { fetchWithRetry } from './upstream.js'
import { readPushStore, saveSubscription, writePushStore } from './pushStore.js'

const require = createRequire(path.join(process.cwd(), 'package.json'))
const webpush = require('web-push')

const DEFAULT_WEBHOOK = 'https://engine.auriforce.com/webhook/fetch-sales-enquiry'

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

function notificationPayload(row) {
  const guest = String(row.guestName ?? '').trim() || 'New guest'
  const type = String(row.enquiryType ?? '').trim() || 'Enquiry'
  return {
    title: 'New Hilton inquiry',
    body: `${guest} · ${type}`,
    tag: `enquiry-${enquiryKey(row)}`,
    url: '/enquiries',
  }
}

export async function addPushSubscription(subscription) {
  configureWebPush()
  return saveSubscription(subscription)
}

export async function dispatchNewEnquiryPushes() {
  const { publicKey, privateKey } = vapidConfig()
  if (!publicKey || !privateKey) {
    return { notified: 0, skipped: 'vapid' }
  }
  configureWebPush()

  const webhookUrl = process.env.SALES_ENQUIRY_WEBHOOK_URL?.trim() || DEFAULT_WEBHOOK
  const upstream = await fetchWithRetry(webhookUrl, { method: 'GET' })
  const text = await upstream.text()
  if (!upstream.ok) {
    throw new Error(text.slice(0, 200) || `Enquiry fetch failed (${upstream.status})`)
  }
  const rows = enquiryList(text.trim() ? JSON.parse(text) : { enquiries: [] })
  const currentIds = rows.map(enquiryKey).filter(Boolean)

  const store = await readPushStore()
  const previous = new Set(store.lastNotifiedIds)
  const isFirstSync = previous.size === 0
  const fresh = isFirstSync ? [] : rows.filter((row) => !previous.has(enquiryKey(row)))

  store.lastNotifiedIds = currentIds
  let stale = []
  let notified = 0

  if (fresh.length > 0 && store.subscriptions.length > 0) {
    const payload = JSON.stringify(
      fresh.length === 1
        ? notificationPayload(fresh[0])
        : {
            title: 'New Hilton inquiries',
            body: `${fresh.length} new enquiries were received.`,
            tag: 'enquiry-batch',
            url: '/enquiries',
          },
    )

    for (const subscription of store.subscriptions) {
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
    store.subscriptions = store.subscriptions.filter((row) => !stale.includes(row.endpoint))
  }
  await writePushStore(store)

  return { notified, newEnquiries: fresh.length, firstSync: isFirstSync }
}

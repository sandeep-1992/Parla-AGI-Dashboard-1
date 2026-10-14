import type { SalesEnquiry } from '../types/enquiry'

const SEEN_KEY = 'hilton-inquiries.seen-ids'
const ENABLED_KEY = 'hilton-inquiries.notifications'

function enquiryKey(row: SalesEnquiry): string {
  return String(row.id || row.conversationId || '')
}

function readSeen(): Set<string> {
  try {
    const raw = localStorage.getItem(SEEN_KEY)
    const parsed = raw ? (JSON.parse(raw) as unknown) : []
    return new Set(Array.isArray(parsed) ? parsed.map(String) : [])
  } catch {
    return new Set()
  }
}

function writeSeen(ids: Iterable<string>) {
  localStorage.setItem(SEEN_KEY, JSON.stringify([...ids]))
}

export function notificationsWanted(): boolean {
  return localStorage.getItem(ENABLED_KEY) === 'on'
}

export function setNotificationsWanted(on: boolean) {
  localStorage.setItem(ENABLED_KEY, on ? 'on' : 'off')
}

export async function registerEnquiryWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null
  try {
    return await navigator.serviceWorker.register('/sw.js')
  } catch {
    return null
  }
}

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const raw = atob(base64.replace(/-/g, '+').replace(/_/g, '/') + padding)
  const output = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i += 1) output[i] = raw.charCodeAt(i)
  return output
}

async function subscribePush(registration: ServiceWorkerRegistration) {
  if (!('PushManager' in window)) return
  const res = await fetch('/api/push/vapid')
  const body = (await res.json().catch(() => ({}))) as { publicKey?: string }
  if (!body.publicKey) return
  const existing = await registration.pushManager.getSubscription()
  const subscription =
    existing ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(body.publicKey) as BufferSource,
    }))
  await fetch('/api/push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ subscription }),
  })
}

export async function enableEnquiryNotifications(): Promise<NotificationPermission | 'unsupported'> {
  if (!('Notification' in window) || !('serviceWorker' in navigator)) return 'unsupported'
  setNotificationsWanted(true)
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return permission
  const registration = await registerEnquiryWorker()
  if (registration) {
    try {
      await subscribePush(registration)
    } catch {
      // Local alerts still work if web-push subscribe fails.
    }
  }
  return permission
}

export async function notifyNewEnquiries(enquiries: SalesEnquiry[]) {
  const keys = enquiries.map(enquiryKey).filter(Boolean)
  const seen = readSeen()
  if (seen.size === 0) {
    writeSeen(keys)
    return
  }

  const fresh = enquiries.filter((row) => !seen.has(enquiryKey(row)))
  writeSeen([...seen, ...keys])
  if (fresh.length === 0 || !notificationsWanted()) return
  if (!('Notification' in window) || Notification.permission !== 'granted') return

  const registration = await navigator.serviceWorker?.ready.catch(() => null)
  const title = fresh.length === 1 ? 'New Hilton inquiry' : 'New Hilton inquiries'
  const first = fresh[0]
  const body =
    fresh.length === 1
      ? `${first?.guestName?.trim() || 'New guest'} · ${first?.enquiryType?.trim() || 'Enquiry'}`
      : `${fresh.length} new enquiries were received.`

  if (registration) {
    await registration.showNotification(title, {
      body,
      icon: '/hilton-logo.png',
      tag: 'hilton-enquiry',
      data: { url: '/enquiries' },
    })
    return
  }

  new Notification(title, { body, icon: '/hilton-logo.png' })
}

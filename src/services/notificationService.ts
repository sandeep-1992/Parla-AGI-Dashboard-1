import type { SalesEnquiry } from '../types/enquiry'

function seenKey(tenantId: string) {
  return `hilton-inquiries.${tenantId || 'default'}.seen-ids`
}

function enabledKey(tenantId: string) {
  return `hilton-inquiries.${tenantId || 'default'}.notifications`
}

export type AlertEnableResult =
  | 'granted'
  | 'denied'
  | 'default'
  | 'unsupported'
  | 'needs-homescreen'

function enquiryKey(row: SalesEnquiry): string {
  return String(row.id || row.conversationId || '')
}

function readSeen(tenantId: string): Set<string> {
  try {
    const raw = localStorage.getItem(seenKey(tenantId))
    const parsed = raw ? (JSON.parse(raw) as unknown) : []
    return new Set(Array.isArray(parsed) ? parsed.map(String) : [])
  } catch {
    return new Set()
  }
}

function writeSeen(tenantId: string, ids: Iterable<string>) {
  localStorage.setItem(seenKey(tenantId), JSON.stringify([...ids]))
}

export function notificationsWanted(tenantId: string): boolean {
  return localStorage.getItem(enabledKey(tenantId)) === 'on'
}

export function setNotificationsWanted(tenantId: string, on: boolean) {
  localStorage.setItem(enabledKey(tenantId), on ? 'on' : 'off')
}

export function isInstalledPwa(): boolean {
  const standalone = window.matchMedia('(display-mode: standalone)').matches
  const iosStandalone =
    'standalone' in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone)
  return standalone || iosStandalone
}

export function isIosDevice(): boolean {
  const ua = navigator.userAgent || ''
  if (/iPad|iPhone|iPod/.test(ua)) return true
  return navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1
}

export async function registerEnquiryWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null
  try {
    const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' })
    await navigator.serviceWorker.ready
    return registration
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

async function subscribePush(registration: ServiceWorkerRegistration, tenantId: string) {
  if (!('PushManager' in window)) return false
  const res = await fetch('/api/push/vapid')
  const body = (await res.json().catch(() => ({}))) as { publicKey?: string }
  if (!body.publicKey) return false

  let subscription = await registration.pushManager.getSubscription()
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(body.publicKey) as BufferSource,
    })
  }

  const save = await fetch('/api/push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ subscription, tenantId }),
  })
  return save.ok
}

async function showOsNotification(title: string, body: string, tag: string, url: string) {
  const registration = await navigator.serviceWorker?.ready.catch(() => null)
  const options: NotificationOptions = {
    body,
    icon: '/hilton-logo.png',
    badge: '/favicon.png',
    tag,
    data: { url },
    requireInteraction: true,
    silent: false,
  }

  if (registration) {
    await registration.showNotification(title, options)
    return
  }

  if ('Notification' in window) {
    new Notification(title, { body, icon: '/hilton-logo.png', tag })
  }
}

export async function enableEnquiryNotifications(
  tenantId: string,
  tenantSlug = tenantId,
): Promise<AlertEnableResult> {
  if (!('Notification' in window)) {
    if (isIosDevice() && !isInstalledPwa()) return 'needs-homescreen'
    return 'unsupported'
  }
  if (!('serviceWorker' in navigator)) {
    if (isIosDevice() && !isInstalledPwa()) return 'needs-homescreen'
    return 'unsupported'
  }

  if (isIosDevice() && !isInstalledPwa()) {
    return 'needs-homescreen'
  }

  setNotificationsWanted(tenantId, true)
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return permission

  const registration = await registerEnquiryWorker()
  if (registration) {
    try {
      await subscribePush(registration, tenantId)
    } catch {
      // Local OS alerts still work without push subscribe.
    }
  }

  await showOsNotification(
    'Alerts ready',
    'You will get a phone notification when a new enquiry arrives.',
    'hilton-alert-test',
    `/t/${tenantSlug}/enquiries`,
  )

  return 'granted'
}

async function fanOutPush(tenantId: string) {
  try {
    await fetch(`/api/push/dispatch?tenant=${encodeURIComponent(tenantId)}`, { method: 'POST' })
  } catch {
    // Ignore fan-out failures; local OS notification already shown.
  }
}

export async function notifyNewEnquiries(tenantId: string, enquiries: SalesEnquiry[], tenantSlug: string) {
  const keys = enquiries.map(enquiryKey).filter(Boolean)
  const seen = readSeen(tenantId)
  if (seen.size === 0) {
    writeSeen(tenantId, keys)
    return
  }

  const fresh = enquiries.filter((row) => !seen.has(enquiryKey(row)))
  writeSeen(tenantId, [...seen, ...keys])
  if (fresh.length === 0 || !notificationsWanted(tenantId)) return
  if (!('Notification' in window) || Notification.permission !== 'granted') return

  const title = fresh.length === 1 ? 'New inquiry' : 'New inquiries'
  const first = fresh[0]
  const body =
    fresh.length === 1
      ? `${first?.guestName?.trim() || 'New guest'} · ${first?.enquiryType?.trim() || 'Enquiry'}`
      : `${fresh.length} new enquiries were received.`
  const tag = fresh.length === 1 ? `enquiry-${enquiryKey(fresh[0]!)}` : 'enquiry-batch'

  await showOsNotification(title, body, tag, `/t/${tenantSlug}/enquiries`)
  void fanOutPush(tenantId)
}

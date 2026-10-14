self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting())
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('push', (event) => {
  let payload = { title: 'Hilton Inquiries', body: 'A new enquiry was received.' }
  try {
    payload = { ...payload, ...(event.data ? event.data.json() : {}) }
  } catch {
    const text = event.data ? event.data.text() : ''
    if (text) payload.body = text
  }

  event.waitUntil(
    self.registration.showNotification(payload.title || 'Hilton Inquiries', {
      body: payload.body || 'A new enquiry was received.',
      icon: '/hilton-logo.png',
      badge: '/favicon.png',
      tag: payload.tag || 'hilton-enquiry',
      data: { url: payload.url || '/enquiries' },
      renotify: true,
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const target = event.notification.data?.url || '/enquiries'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ('focus' in client) {
          client.navigate?.(target)
          return client.focus()
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(target)
      return undefined
    }),
  )
})

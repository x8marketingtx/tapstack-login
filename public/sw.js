/* TapStack service worker — installability + push. */
const VERSION = 'tapstack-pwa-1'

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting())
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key.startsWith('tapstack-pwa-') && key !== VERSION).map((key) => caches.delete(key))),
    ).then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)
  if (event.request.method !== 'GET') return
  if (url.pathname.startsWith('/wp-json/') || url.pathname.startsWith('/wp-admin/')) return
  event.respondWith(fetch(event.request).catch(() => caches.match(event.request)))
})

self.addEventListener('push', (event) => {
  let payload = { title: 'TapStack', body: 'You have a new update.', url: '/customer' }
  try {
    if (event.data) {
      const parsed = event.data.json()
      if (parsed && typeof parsed === 'object') payload = { ...payload, ...parsed }
    }
  } catch {
    const text = event.data ? event.data.text() : ''
    if (text) payload.body = text
  }
  event.waitUntil(
    self.registration.showNotification(payload.title || 'TapStack', {
      body: payload.body || '',
      icon: '/pwa-192.png',
      badge: '/pwa-192.png',
      data: { url: payload.url || '/customer' },
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const target = (event.notification.data && event.notification.data.url) || '/customer'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ('focus' in client) {
          client.focus()
          if ('navigate' in client) client.navigate(target)
          return
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(target)
    }),
  )
})

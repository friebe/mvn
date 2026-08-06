/* Focus Stint on toast click; Yes / +5 min without stealing focus. */
self.addEventListener('notificationclick', (event) => {
  const action = event.action
  event.notification.close()

  if (action === 'check-in-yes') {
    event.waitUntil(postToClients('stint-check-in-yes', 'checkIn'))
    return
  }

  if (action === 'snooze-5') {
    event.waitUntil(postToClients('stint-snooze-5', 'snooze'))
    return
  }

  event.waitUntil(focusStint())
})

async function postToClients(type, openParam) {
  const all = await self.clients.matchAll({
    type: 'window',
    includeUncontrolled: true,
  })
  let messaged = false
  for (const client of all) {
    client.postMessage({ type })
    messaged = true
  }
  if (messaged) return

  if (self.clients.openWindow) {
    const url = new URL(self.registration.scope)
    url.searchParams.set(openParam, '1')
    await self.clients.openWindow(url.href)
  }
}

async function focusStint() {
  const all = await self.clients.matchAll({
    type: 'window',
    includeUncontrolled: true,
  })
  for (const client of all) {
    if ('focus' in client) {
      await client.focus()
      return
    }
  }
  if (self.clients.openWindow) {
    await self.clients.openWindow(self.registration.scope)
  }
}

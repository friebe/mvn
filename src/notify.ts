export async function ensureNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false
  if (Notification.permission === 'granted') return true
  if (Notification.permission === 'denied') return false
  const result = await Notification.requestPermission()
  return result === 'granted'
}

async function getReadyRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null
  try {
    return await navigator.serviceWorker.ready
  } catch {
    return null
  }
}

/** Prefer Service Worker notifications (works better for installed PWAs). */
export async function notifyPhase(
  title: string,
  body: string,
  enabled: boolean,
): Promise<void> {
  if (!enabled) return
  if (!('Notification' in window)) return
  if (Notification.permission !== 'granted') return

  const options: NotificationOptions = {
    body,
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    // Keep silent so in-app mute stays mute at OS level
    silent: true,
    tag: 'mvn-phase',
  }

  try {
    const reg = await getReadyRegistration()
    if (reg?.showNotification) {
      await reg.showNotification(title, options)
      return
    }
  } catch {
    // fall through to page Notification
  }

  try {
    const n = new Notification(title, options)
    n.onclick = () => {
      window.focus()
      n.close()
    }
  } catch {
    // blocked / insecure context
  }
}

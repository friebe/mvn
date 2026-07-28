import { appPath } from './paths'

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

export interface NotifyOptions {
  /** OS toast stays until dismissed (where supported, e.g. Windows). */
  persistent?: boolean
  /** Play the system notification sound (in-app mute stays separate). */
  playSound?: boolean
}

/** Prefer Service Worker notifications (works better for installed PWAs). */
export async function notifyPhase(
  title: string,
  body: string,
  enabled: boolean,
  opts: NotifyOptions = {},
): Promise<void> {
  if (!enabled) return
  if (!('Notification' in window)) return
  if (Notification.permission !== 'granted') return

  const icon = appPath('icons/icon-192.png')
  const options: NotificationOptions = {
    body,
    icon,
    badge: icon,
    silent: !opts.playSound,
    // Unique tag so Windows shows a fresh toast instead of silently replacing in the panel.
    tag: `mvn-${Date.now()}`,
    requireInteraction: opts.persistent === true,
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

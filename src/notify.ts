import { absoluteAssetUrl } from './paths'

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

/** One tag — new toasts replace the previous instead of stacking. */
const NOTIFY_TAG = 'stint'
/** Auto-dismiss when not in “keep visible” mode (page + SW). */
const AUTO_DISMISS_MS = 8_000

async function dismissTagged(reg: ServiceWorkerRegistration): Promise<void> {
  try {
    const list = await reg.getNotifications({ tag: NOTIFY_TAG })
    for (const n of list) n.close()
  } catch {
    // getNotifications unsupported or SW gone
  }
}

function scheduleAutoDismiss(reg: ServiceWorkerRegistration | null, pageNote?: Notification): void {
  window.setTimeout(() => {
    if (reg) void dismissTagged(reg)
    pageNote?.close()
  }, AUTO_DISMISS_MS)
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

  const persistent = opts.persistent === true
  // Absolute URLs + cache bust — Windows often ignores relative/cached PWA icons.
  const icon = absoluteAssetUrl('icons/icon-192.png')
  const badge = absoluteAssetUrl('icons/icon-96.png')
  const options: NotificationOptions = {
    body,
    icon,
    badge,
    silent: !opts.playSound,
    tag: NOTIFY_TAG,
    requireInteraction: persistent,
  }

  try {
    const reg = await getReadyRegistration()
    if (reg?.showNotification) {
      await reg.showNotification(title, options)
      if (!persistent) scheduleAutoDismiss(reg)
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
    if (!persistent) scheduleAutoDismiss(null, n)
  } catch {
    // blocked / insecure context
  }
}

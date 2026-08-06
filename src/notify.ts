import { absoluteAssetUrl } from './paths'

/** SW notification action — confirm mid-phase check-in without focusing Stint. */
export const CHECK_IN_YES_ACTION = 'check-in-yes'

/** postMessage / client bridge type */
export const CHECK_IN_YES_MESSAGE = 'stint-check-in-yes'

/** SW action — +5 min same posture from threshold toast (deep work). */
export const SNOOZE_POSTURE_ACTION = 'snooze-5'

export const SNOOZE_POSTURE_MESSAGE = 'stint-snooze-5'

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
  /** Action buttons (Service Worker notifications only; e.g. check-in Yes). */
  actions?: { action: string; title: string }[]
  /** Payload for notificationclick (e.g. { type: 'check-in' }). */
  data?: unknown
  /**
   * Stay until dismissed. Defaults to `persistent` (Settings “Keep toast visible”).
   * Check-in Yes toasts use normal auto-dismiss unless that setting is on —
   * dismissing without Yes is not a desk proof (in-app timeout still applies).
   */
  requireInteraction?: boolean
}

/** One tag — new toasts replace the previous instead of stacking. */
const NOTIFY_TAG = 'stint'
/** Auto-dismiss when not requireInteraction (page + SW). */
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
  const requireInteraction = opts.requireInteraction ?? persistent
  // Absolute URLs + cache bust — Windows often ignores relative/cached PWA icons.
  const icon = absoluteAssetUrl('icons/icon-192.png')
  const badge = absoluteAssetUrl('icons/icon-96.png')
  const options: NotificationOptions & {
    actions?: { action: string; title: string }[]
  } = {
    body,
    icon,
    badge,
    silent: !opts.playSound,
    tag: NOTIFY_TAG,
    requireInteraction,
    data: opts.data ?? null,
  }

  if (opts.actions && opts.actions.length > 0) {
    options.actions = opts.actions.map((a) => ({
      action: a.action,
      title: a.title,
    }))
  }

  try {
    const reg = await getReadyRegistration()
    if (reg?.showNotification) {
      await reg.showNotification(title, options)
      if (!requireInteraction) scheduleAutoDismiss(reg)
      return
    }
  } catch {
    // fall through to page Notification
  }

  try {
    // Page notifications cannot show action buttons — click still focuses Stint.
    const { actions: _actions, ...pageOpts } = options
    const n = new Notification(title, pageOpts)
    n.onclick = () => {
      window.focus()
      n.close()
    }
    if (!requireInteraction) scheduleAutoDismiss(null, n)
  } catch {
    // blocked / insecure context
  }
}

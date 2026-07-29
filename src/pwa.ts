import { registerSW } from 'virtual:pwa-register'

export type InstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const INSTALLED_KEY = 'mvn-pwa-installed'
const DISMISSED_KEY = 'mvn-install-banner-dismissed'
/** Soft “Not now” — banner may return after this (Settings always offers install). */
const DISMISS_COOLDOWN_MS = 14 * 24 * 60 * 60 * 1000

let deferredPrompt: InstallPromptEvent | null = null
let bannerDismissedSession = false
const installListeners = new Set<() => void>()

export function onInstallAvailability(fn: () => void): () => void {
  installListeners.add(fn)
  fn()
  return () => installListeners.delete(fn)
}

function emitInstall(): void {
  for (const fn of installListeners) fn()
}

export function markPwaInstalled(): void {
  try {
    localStorage.setItem(INSTALLED_KEY, '1')
  } catch {
    // LocalStorage unavailable — standalone check still works this session.
  }
}

export function isPwaInstalled(): boolean {
  if (isStandaloneDisplay()) {
    markPwaInstalled()
    return true
  }
  try {
    return localStorage.getItem(INSTALLED_KEY) === '1'
  } catch {
    return false
  }
}

function readDismissedAt(): number | null {
  try {
    const raw = localStorage.getItem(DISMISSED_KEY)
    if (!raw) return null
    // Legacy: plain "1" meant forever — treat as just-dismissed once, then migrate to timestamp.
    if (raw === '1') {
      const at = Date.now()
      localStorage.setItem(DISMISSED_KEY, String(at))
      return at
    }
    const at = Number(raw)
    return Number.isFinite(at) ? at : null
  } catch {
    return null
  }
}

export function isInstallBannerDismissed(): boolean {
  if (bannerDismissedSession) return true
  const at = readDismissedAt()
  if (at == null) return false
  return Date.now() - at < DISMISS_COOLDOWN_MS
}

export function dismissInstallBanner(): void {
  bannerDismissedSession = true
  try {
    localStorage.setItem(DISMISSED_KEY, String(Date.now()))
  } catch {
    // In-memory flag still hides the banner for this session.
  }
  emitInstall()
}

export function shouldShowInstallBanner(): boolean {
  return canInstallPwa() && !isStandaloneDisplay() && !isInstallBannerDismissed()
}

/** True when we should offer install somewhere (Settings), not only the home banner. */
export function shouldOfferInstall(): boolean {
  // Prefer live display-mode — LocalStorage “installed” can linger after uninstall.
  return !isStandaloneDisplay()
}

export function registerPwa(): void {
  try {
    // Session soft-hide only while cooldown active from a prior dismiss this visit’s first paint.
    bannerDismissedSession = false
    void readDismissedAt()
  } catch {
    bannerDismissedSession = false
  }

  registerSW({
    immediate: true,
    onRegisteredSW(_url, registration) {
      // Keep SW warm so notifications can use registration.showNotification
      void registration
    },
  })

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferredPrompt = e as InstallPromptEvent
    emitInstall()
  })

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null
    markPwaInstalled()
    emitInstall()
  })

  for (const mode of ['standalone', 'fullscreen', 'minimal-ui'] as const) {
    window.matchMedia(`(display-mode: ${mode})`).addEventListener('change', () => {
      if (isPwaInstalled()) emitInstall()
    })
  }
}

export function canInstallPwa(): boolean {
  return deferredPrompt != null
}

export async function promptInstallPwa(): Promise<boolean> {
  if (!deferredPrompt) return false
  const prompt = deferredPrompt
  deferredPrompt = null
  emitInstall()
  await prompt.prompt()
  const { outcome } = await prompt.userChoice
  if (outcome === 'accepted') {
    markPwaInstalled()
  }
  emitInstall()
  return outcome === 'accepted'
}

export function isStandaloneDisplay(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches ||
    window.matchMedia('(display-mode: minimal-ui)').matches ||
    ('standalone' in navigator &&
      Boolean((navigator as Navigator & { standalone?: boolean }).standalone))
  )
}

/** Short manual path when the browser won’t expose a programmatic install prompt. */
export function installManualHint(): string {
  const ua = navigator.userAgent
  if (/iPhone|iPad|iPod/i.test(ua)) {
    return 'Safari → Share → Add to Home Screen.'
  }
  if (/Edg\//i.test(ua)) {
    return 'Edge menu (⋯) → Apps → Install this site as an app.'
  }
  if (/Chrome\//i.test(ua) && /Android/i.test(ua)) {
    return 'Chrome menu (⋮) → Install app / Add to Home screen.'
  }
  if (/Chrome\//i.test(ua) || /Chromium/i.test(ua)) {
    return 'Chrome → address bar install icon, or menu (⋮) → Install Stint…'
  }
  if (/Firefox\//i.test(ua)) {
    return 'Firefox → address bar → Install / Add to Home Screen (where available).'
  }
  return 'Use your browser’s Install / Add to Home Screen action for this site.'
}

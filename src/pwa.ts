import { registerSW } from 'virtual:pwa-register'

export type InstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const INSTALLED_KEY = 'mvn-pwa-installed'
const DISMISSED_KEY = 'mvn-install-banner-dismissed'

let deferredPrompt: InstallPromptEvent | null = null
let bannerDismissed = false
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

export function isInstallBannerDismissed(): boolean {
  if (bannerDismissed) return true
  try {
    return localStorage.getItem(DISMISSED_KEY) === '1'
  } catch {
    return false
  }
}

export function dismissInstallBanner(): void {
  bannerDismissed = true
  try {
    localStorage.setItem(DISMISSED_KEY, '1')
  } catch {
    // In-memory flag still hides the banner for this session.
  }
  emitInstall()
}

export function shouldShowInstallBanner(): boolean {
  return canInstallPwa() && !isPwaInstalled() && !isInstallBannerDismissed()
}

export function registerPwa(): void {
  try {
    bannerDismissed = localStorage.getItem(DISMISSED_KEY) === '1'
  } catch {
    bannerDismissed = false
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

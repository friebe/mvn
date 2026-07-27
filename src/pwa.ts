import { registerSW } from 'virtual:pwa-register'

export type InstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

let deferredPrompt: InstallPromptEvent | null = null
const installListeners = new Set<(canInstall: boolean) => void>()

export function onInstallAvailability(fn: (canInstall: boolean) => void): () => void {
  installListeners.add(fn)
  fn(deferredPrompt != null)
  return () => installListeners.delete(fn)
}

function emitInstall(): void {
  const can = deferredPrompt != null
  for (const fn of installListeners) fn(can)
}

export function registerPwa(): void {
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
    emitInstall()
  })
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
    ('standalone' in navigator &&
      Boolean((navigator as Navigator & { standalone?: boolean }).standalone))
  )
}

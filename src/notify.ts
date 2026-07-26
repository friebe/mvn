export async function ensureNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false
  if (Notification.permission === 'granted') return true
  if (Notification.permission === 'denied') return false
  const result = await Notification.requestPermission()
  return result === 'granted'
}

export function notifyPhase(title: string, body: string, enabled: boolean): void {
  if (!enabled) return
  if (!('Notification' in window)) return
  if (Notification.permission !== 'granted') return
  try {
    const n = new Notification(title, {
      body,
      icon: '/icons/icon.svg',
      silent: true,
      tag: 'mvn-phase',
    })
    n.onclick = () => {
      window.focus()
      n.close()
    }
  } catch {
    // Ignore — some browsers block without service worker in insecure contexts
  }
}

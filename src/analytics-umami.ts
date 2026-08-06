import { isStandaloneDisplay } from './pwa'

declare global {
  interface Window {
    umami?: {
      track: (event: string, data?: Record<string, unknown>) => void
    }
  }
}

/** Fire once when Stint runs as installed PWA (display-mode), for Umami Events. */
export function trackPwaLaunch(): void {
  if (!isStandaloneDisplay()) return

  const send = (): void => {
    window.umami?.track('pwa-launch', { display: 'standalone' })
  }

  if (window.umami) {
    send()
    return
  }

  // Script is defer — wait briefly for cloud.umami.is
  let tries = 0
  const id = window.setInterval(() => {
    tries += 1
    if (window.umami) {
      window.clearInterval(id)
      send()
    } else if (tries >= 50) {
      window.clearInterval(id)
    }
  }, 100)
}

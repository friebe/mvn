import { isStandaloneDisplay } from './pwa'

declare global {
  interface Window {
    umami?: {
      track: (event: string, data?: Record<string, unknown>) => void
    }
  }
}

const PWA_LAUNCH_EVENT = 'pwa-launch'
const UMAMI_POLL_MS = 200
const UMAMI_MAX_TRIES = 150 // ~30s — adblock / slow CDN

let pwaLaunchSent = false

function hasPwaStartUrlParams(): boolean {
  const params = new URLSearchParams(window.location.search)
  return params.get('utm_source') === 'pwa' && params.get('utm_medium') === 'standalone'
}

function shouldTrackPwaLaunch(): boolean {
  // display-mode is the primary signal; manifest start_url UTMs cover browsers that lag on matchMedia.
  return isStandaloneDisplay() || hasPwaStartUrlParams()
}

function pwaLaunchPayload(): Record<string, string> {
  const modes = ['standalone', 'fullscreen', 'minimal-ui', 'browser'] as const
  const matched = modes.filter((mode) => window.matchMedia(`(display-mode: ${mode})`).matches)
  return {
    via: isStandaloneDisplay() ? 'display-mode' : 'start-url-utm',
    display: matched[0] ?? 'unknown',
    modes: matched.join(','),
  }
}

function sendPwaLaunch(): boolean {
  if (pwaLaunchSent || !shouldTrackPwaLaunch()) return pwaLaunchSent

  const track = window.umami?.track
  if (typeof track !== 'function') return false

  track(PWA_LAUNCH_EVENT, pwaLaunchPayload())
  pwaLaunchSent = true
  return true
}

function waitForUmami(): void {
  if (sendPwaLaunch()) return

  let tries = 0
  const id = window.setInterval(() => {
    tries += 1
    if (sendPwaLaunch() || tries >= UMAMI_MAX_TRIES) {
      window.clearInterval(id)
    }
  }, UMAMI_POLL_MS)
}

/** Once per page load when Stint runs as installed PWA — Umami Events tab. */
export function trackPwaLaunch(): void {
  if (!shouldTrackPwaLaunch()) return

  const run = (): void => {
    waitForUmami()
  }

  if (document.readyState === 'complete') {
    run()
  } else {
    window.addEventListener('load', run, { once: true })
  }
}

/** Keep the screen on during a pack run — floor stretches, phone out of reach. */

type WakeLockSentinelLike = {
  release: () => Promise<void>
  addEventListener: (type: 'release', fn: () => void) => void
}

let sentinel: WakeLockSentinelLike | null = null
let wanted = false
let listening = false

async function acquire(): Promise<void> {
  if (!wanted) return
  if (!('wakeLock' in navigator)) return
  try {
    const next = await (
      navigator as Navigator & {
        wakeLock: { request: (type: 'screen') => Promise<WakeLockSentinelLike> }
      }
    ).wakeLock.request('screen')
    sentinel = next
    next.addEventListener('release', () => {
      if (sentinel === next) sentinel = null
    })
  } catch {
    sentinel = null
  }
}

function release(): void {
  const current = sentinel
  sentinel = null
  if (!current) return
  void current.release().catch(() => {
    // Already released by the browser.
  })
}

function onVisibility(): void {
  if (document.visibilityState === 'visible' && wanted) void acquire()
}

/** Hold the screen awake while `on` — re-acquires when the tab becomes visible again. */
export function setPackPlayAwake(on: boolean): void {
  wanted = on
  if (!listening) {
    listening = true
    document.addEventListener('visibilitychange', onVisibility)
  }
  if (on) {
    void acquire()
    return
  }
  release()
}

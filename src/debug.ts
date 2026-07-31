import { isLocalDebugHost, wantsDebugPauseFromUrl } from './debug-host'
import {
  bindSplashDebugEvent,
  isSplashVisible,
  SPLASH_DEBUG_EVENT,
  toggleLaunchSplashPreview,
} from './splash'
import {
  getState,
  isTimerPaused,
  setTimerPaused,
  subscribe,
  subscribeTimerPause,
  toggleTimerPaused,
} from './timer'

/** Floating pause + splash preview — only mounts on localhost / 127.0.0.1. */
export function mountDebugToolbar(): void {
  if (!isLocalDebugHost()) return

  const bar = document.createElement('div')
  bar.className = 'debug-bar'
  bar.setAttribute('role', 'region')
  bar.setAttribute('aria-label', 'Local debug')

  const phaseEl = document.createElement('span')
  phaseEl.className = 'debug-bar-phase'

  const btnPause = document.createElement('button')
  btnPause.type = 'button'
  btnPause.className = 'debug-bar-btn'

  const btnSplash = document.createElement('button')
  btnSplash.type = 'button'
  btnSplash.className = 'debug-bar-btn'
  btnSplash.title = `Or: dispatchEvent(new Event('${SPLASH_DEBUG_EVENT}'))`

  const hint = document.createElement('span')
  hint.className = 'debug-bar-hint'
  hint.textContent = 'Shift+P · Shift+S'

  bar.append(phaseEl, btnPause, btnSplash, hint)
  document.body.appendChild(bar)

  const unbindSplashEvent = bindSplashDebugEvent()

  const render = () => {
    const paused = isTimerPaused()
    const { phase } = getState()
    const splashOn = isSplashVisible()
    phaseEl.textContent = phase
    btnPause.textContent = paused ? '▶ Continue' : '⏸ Pause'
    btnPause.setAttribute('aria-pressed', paused ? 'true' : 'false')
    btnSplash.textContent = splashOn ? 'Splash on' : 'Splash'
    btnSplash.setAttribute('aria-pressed', splashOn ? 'true' : 'false')
    bar.dataset.paused = paused ? 'true' : 'false'
    bar.dataset.splash = splashOn ? 'true' : 'false'
  }

  btnPause.addEventListener('click', () => toggleTimerPaused())
  btnSplash.addEventListener('click', () => {
    toggleLaunchSplashPreview()
    render()
  })

  window.addEventListener('keydown', (e) => {
    if (!e.shiftKey || e.metaKey || e.ctrlKey || e.altKey) return
    const t = e.target
    if (t instanceof HTMLElement) {
      const tag = t.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || t.isContentEditable) return
    }
    const key = e.key.toLowerCase()
    if (key === 'p') {
      e.preventDefault()
      toggleTimerPaused()
      return
    }
    if (key === 's') {
      e.preventDefault()
      toggleLaunchSplashPreview()
      render()
    }
  })

  // Keep Splash button label in sync when toggled via custom event.
  window.addEventListener(SPLASH_DEBUG_EVENT, () => {
    window.setTimeout(render, 0)
  })

  subscribe(() => render())
  subscribeTimerPause(render)
  render()

  if (wantsDebugPauseFromUrl()) {
    setTimerPaused(true)
  }

  // Keep unsubscribe reachable for hot reload / tests (toolbar is session-long).
  void unbindSplashEvent
}

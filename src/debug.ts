import {
  isLocalDebugHost,
  wantsDebugInstallFromUrl,
  wantsDebugPauseFromUrl,
  wantsDebugSplashFromUrl,
  wantsDebugUpdateFromUrl,
} from './debug-host'
import {
  dismissUpdateBanner,
  isInstallBannerPreview,
  onInstallAvailability,
  onUpdateAvailability,
  setInstallBannerPreview,
  setUpdateBannerPreview,
  shouldShowUpdateBanner,
} from './pwa'
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

const BAR_HIDDEN_KEY = 'stint.debug-bar-hidden'

function readBarHidden(): boolean {
  try {
    return sessionStorage.getItem(BAR_HIDDEN_KEY) === '1'
  } catch {
    return false
  }
}

function writeBarHidden(on: boolean): void {
  try {
    if (on) sessionStorage.setItem(BAR_HIDDEN_KEY, '1')
    else sessionStorage.removeItem(BAR_HIDDEN_KEY)
  } catch {
    // session flag still applied in the DOM
  }
}

type DebugFeature = {
  id: string
  shortcut: string
  label: (on: boolean) => string
  title: string
  get: () => boolean
  toggle: () => void
}

function debugFeatures(): DebugFeature[] {
  return [
    {
      id: 'pause',
      shortcut: 'p',
      label: (on) => (on ? '▶ Continue' : '⏸ Pause'),
      title: 'Shift+P — freeze the clock',
      get: isTimerPaused,
      toggle: toggleTimerPaused,
    },
    {
      id: 'splash',
      shortcut: 's',
      label: (on) => (on ? 'Splash on' : 'Splash'),
      title: `Shift+S — or dispatchEvent(new Event('${SPLASH_DEBUG_EVENT}'))`,
      get: isSplashVisible,
      toggle: () => {
        toggleLaunchSplashPreview()
      },
    },
    {
      id: 'update',
      shortcut: 'u',
      label: (on) => (on ? 'Update on' : 'Update'),
      title: 'Shift+U — preview the PWA update banner',
      get: shouldShowUpdateBanner,
      toggle: () => {
        if (shouldShowUpdateBanner()) {
          dismissUpdateBanner()
          return
        }
        setInstallBannerPreview(false)
        setUpdateBannerPreview(true)
      },
    },
    {
      id: 'install',
      shortcut: 'i',
      label: (on) => (on ? 'Install on' : 'Install'),
      title: 'Shift+I — preview the install banner',
      get: isInstallBannerPreview,
      toggle: () => {
        if (isInstallBannerPreview()) {
          setInstallBannerPreview(false)
          return
        }
        dismissUpdateBanner()
        setInstallBannerPreview(true)
      },
    },
  ]
}

/** Feature-toggle bar — only mounts on localhost / 127.0.0.1. */
export function mountDebugToolbar(): void {
  if (!isLocalDebugHost()) return
  if (document.querySelector('.debug-bar')) return

  const features = debugFeatures()

  const bar = document.createElement('div')
  bar.className = 'debug-bar'
  bar.setAttribute('role', 'region')
  bar.setAttribute('aria-label', 'Local debug')

  const phaseEl = document.createElement('span')
  phaseEl.className = 'debug-bar-phase'

  const buttons = new Map<string, HTMLButtonElement>()
  for (const feature of features) {
    const btn = document.createElement('button')
    btn.type = 'button'
    btn.className = 'debug-bar-btn'
    btn.dataset.feature = feature.id
    btn.title = feature.title
    btn.addEventListener('click', () => {
      feature.toggle()
      render()
    })
    buttons.set(feature.id, btn)
  }

  const hint = document.createElement('span')
  hint.className = 'debug-bar-hint'
  hint.textContent = `Shift+${features.map((f) => f.shortcut.toUpperCase()).join(' ')} D`

  const close = document.createElement('button')
  close.type = 'button'
  close.className = 'debug-bar-btn debug-bar-close'
  close.setAttribute('aria-label', 'Hide debug bar')
  close.title = 'Hide — Shift+D to show again'
  close.textContent = '×'

  bar.append(phaseEl, ...buttons.values(), hint, close)
  document.body.appendChild(bar)

  const setCollapsed = (on: boolean) => {
    bar.hidden = on
    writeBarHidden(on)
  }

  close.addEventListener('click', () => setCollapsed(true))
  setCollapsed(readBarHidden())

  const unbindSplashEvent = bindSplashDebugEvent()

  const render = () => {
    phaseEl.textContent = getState().phase
    bar.dataset.paused = isTimerPaused() ? 'true' : 'false'
    for (const feature of features) {
      const btn = buttons.get(feature.id)
      if (!btn) continue
      const on = feature.get()
      btn.textContent = feature.label(on)
      btn.setAttribute('aria-pressed', on ? 'true' : 'false')
    }
  }

  window.addEventListener('keydown', (e) => {
    if (!e.shiftKey || e.metaKey || e.ctrlKey || e.altKey) return
    const t = e.target
    if (t instanceof HTMLElement) {
      const tag = t.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || t.isContentEditable) return
    }
    const key = e.key.toLowerCase()
    if (key === 'd') {
      e.preventDefault()
      setCollapsed(!bar.hidden)
      return
    }
    const feature = features.find((f) => f.shortcut === key)
    if (!feature) return
    e.preventDefault()
    feature.toggle()
    render()
  })

  window.addEventListener(SPLASH_DEBUG_EVENT, () => {
    window.setTimeout(render, 0)
  })

  subscribe(() => render())
  subscribeTimerPause(render)
  onInstallAvailability(render)
  onUpdateAvailability(render)
  render()

  if (wantsDebugPauseFromUrl()) setTimerPaused(true)
  if (wantsDebugSplashFromUrl()) toggleLaunchSplashPreview()
  if (wantsDebugUpdateFromUrl()) {
    setInstallBannerPreview(false)
    setUpdateBannerPreview(true)
  }
  if (wantsDebugInstallFromUrl()) {
    dismissUpdateBanner()
    setInstallBannerPreview(true)
  }
  render()

  void unbindSplashEvent
}

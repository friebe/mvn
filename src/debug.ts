import { isLocalDebugHost, wantsDebugPauseFromUrl } from './debug-host'
import {
  getState,
  isTimerPaused,
  setTimerPaused,
  subscribe,
  subscribeTimerPause,
  toggleTimerPaused,
} from './timer'

/** Floating pause control — only mounts on localhost / 127.0.0.1. */
export function mountDebugToolbar(): void {
  if (!isLocalDebugHost()) return

  const bar = document.createElement('div')
  bar.className = 'debug-bar'
  bar.setAttribute('role', 'region')
  bar.setAttribute('aria-label', 'Local debug')

  const phaseEl = document.createElement('span')
  phaseEl.className = 'debug-bar-phase'

  const btn = document.createElement('button')
  btn.type = 'button'
  btn.className = 'debug-bar-btn'

  const hint = document.createElement('span')
  hint.className = 'debug-bar-hint'
  hint.textContent = 'Shift+P'

  bar.append(phaseEl, btn, hint)
  document.body.appendChild(bar)

  const render = () => {
    const paused = isTimerPaused()
    const { phase } = getState()
    phaseEl.textContent = phase
    btn.textContent = paused ? '▶ Weiter' : '⏸ Pause'
    btn.setAttribute('aria-pressed', paused ? 'true' : 'false')
    bar.dataset.paused = paused ? 'true' : 'false'
  }

  btn.addEventListener('click', () => toggleTimerPaused())

  window.addEventListener('keydown', (e) => {
    if (!e.shiftKey || e.key.toLowerCase() !== 'p') return
    if (e.metaKey || e.ctrlKey || e.altKey) return
    const t = e.target
    if (t instanceof HTMLElement) {
      const tag = t.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || t.isContentEditable) return
    }
    e.preventDefault()
    toggleTimerPaused()
  })

  subscribe(() => render())
  subscribeTimerPause(render)
  render()

  if (wantsDebugPauseFromUrl()) {
    setTimerPaused(true)
  }
}

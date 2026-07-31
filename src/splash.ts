import { brandLockupHtml, BRAND_TAG } from './brand-mark'

const SESSION_KEY = 'stint.splash'
const SPLASH_ID = 'splash'
const HOLD_MS = 1400
const FADE_MS = 480

/** Dev / console: `window.dispatchEvent(new Event('stint:debug-splash'))` */
export const SPLASH_DEBUG_EVENT = 'stint:debug-splash'

let fadeTimer: number | null = null
let holdTimer: number | null = null
let previewSticky = false

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function alreadyShownThisSession(): boolean {
  try {
    return sessionStorage.getItem(SESSION_KEY) === '1'
  } catch {
    return false
  }
}

function markShown(): void {
  try {
    sessionStorage.setItem(SESSION_KEY, '1')
  } catch {
    // ignore
  }
}

function clearSplashTimers(): void {
  if (holdTimer != null) {
    window.clearTimeout(holdTimer)
    holdTimer = null
  }
  if (fadeTimer != null) {
    window.clearTimeout(fadeTimer)
    fadeTimer = null
  }
}

export function isSplashVisible(): boolean {
  return document.getElementById(SPLASH_ID) != null
}

function mountSplashEl(): HTMLElement {
  let el = document.getElementById(SPLASH_ID)
  if (el) return el

  el = document.createElement('div')
  el.className = 'splash'
  el.id = SPLASH_ID
  el.setAttribute('role', 'presentation')
  // Same lockup as header: mark + Stint, tag under the wordmark — header scale.
  el.innerHTML = `<div class="splash-inner">${brandLockupHtml(BRAND_TAG, 32)}</div>`
  document.body.appendChild(el)
  return el
}

function playEnter(el: HTMLElement): void {
  el.classList.remove('is-out')
  // Force reflow so re-entry animates
  void el.offsetWidth
  requestAnimationFrame(() => {
    el.classList.add('is-in')
  })
}

function scheduleAutoDismiss(el: HTMLElement): void {
  clearSplashTimers()
  const hold = prefersReducedMotion() ? 200 : HOLD_MS
  const fade = prefersReducedMotion() ? 120 : FADE_MS
  holdTimer = window.setTimeout(() => {
    el.classList.add('is-out')
    fadeTimer = window.setTimeout(() => {
      el.remove()
      previewSticky = false
      holdTimer = null
      fadeTimer = null
    }, fade)
  }, hold)
}

/**
 * Classic app-open splash: mark + wordmark + subline, then soft fade.
 * Once per browser tab session so Settings ↔ Home doesn’t re-splash.
 */
export function showLaunchSplash(): void {
  if (alreadyShownThisSession()) return
  markShown()
  previewSticky = false
  const el = mountSplashEl()
  playEnter(el)
  scheduleAutoDismiss(el)
}

/** Remove splash immediately (dev preview off). */
export function dismissLaunchSplash(): void {
  clearSplashTimers()
  previewSticky = false
  document.getElementById(SPLASH_ID)?.remove()
}

/**
 * Dev preview: show splash and keep it until toggled off.
 * Re-click / re-dispatch removes it.
 */
export function toggleLaunchSplashPreview(): boolean {
  if (isSplashVisible() && previewSticky) {
    dismissLaunchSplash()
    return false
  }
  clearSplashTimers()
  previewSticky = true
  const el = mountSplashEl()
  playEnter(el)
  return true
}

/** Listen for `stint:debug-splash` (and return unsubscribe). */
export function bindSplashDebugEvent(): () => void {
  const onEvent = () => {
    toggleLaunchSplashPreview()
  }
  window.addEventListener(SPLASH_DEBUG_EVENT, onEvent)
  return () => window.removeEventListener(SPLASH_DEBUG_EVENT, onEvent)
}

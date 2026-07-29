/**
 * Approximate “something else is on top / you’re elsewhere”.
 * Browsers cannot detect true window overlap — only focus + page visibility.
 * Second-monitor case: Stint stays “visible” but window blur → away.
 */

export type PresenceListener = (away: boolean) => void

let away = false
const listeners = new Set<PresenceListener>()

function computeAway(): boolean {
  if (typeof document === 'undefined') return false
  if (document.visibilityState === 'hidden') return true
  try {
    return !document.hasFocus()
  } catch {
    return false
  }
}

function publish(): void {
  const next = computeAway()
  if (next === away) return
  away = next
  for (const fn of listeners) fn(away)
}

/** True when the tab is hidden or another window has focus. */
export function isAppAway(): boolean {
  return away
}

export function subscribePresence(fn: PresenceListener): () => void {
  listeners.add(fn)
  fn(away)
  return () => listeners.delete(fn)
}

export function initPresence(): void {
  publish()
  window.addEventListener('blur', publish)
  window.addEventListener('focus', publish)
  document.addEventListener('visibilitychange', publish)
  // Some hosts report focus a tick after visibility flips.
  window.addEventListener('pageshow', publish)
}

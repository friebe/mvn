/** Localhost-only debug helpers — never shown on production hosts. */

export function isLocalDebugHost(): boolean {
  if (typeof window === 'undefined') return false
  const host = window.location.hostname
  return host === 'localhost' || host === '127.0.0.1' || host === '[::1]'
}

export function wantsDebugPauseFromUrl(): boolean {
  if (!isLocalDebugHost()) return false
  const params = new URLSearchParams(window.location.search)
  return params.get('pause') === '1' || params.get('debugPause') === '1'
}

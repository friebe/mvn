/** Localhost-only debug helpers — never shown on production hosts. */

export function isLocalDebugHost(): boolean {
  if (typeof window === 'undefined') return false
  const host = window.location.hostname
  return host === 'localhost' || host === '127.0.0.1' || host === '[::1]'
}

function debugFlag(name: string): boolean {
  if (!isLocalDebugHost()) return false
  return new URLSearchParams(window.location.search).get(name) === '1'
}

export function wantsDebugPauseFromUrl(): boolean {
  return debugFlag('pause') || debugFlag('debugPause')
}

export function wantsDebugSplashFromUrl(): boolean {
  return debugFlag('splash')
}

export function wantsDebugUpdateFromUrl(): boolean {
  return debugFlag('update')
}

export function wantsDebugInstallFromUrl(): boolean {
  return debugFlag('install')
}

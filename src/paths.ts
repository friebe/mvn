/** Vite base path, e.g. `/mvn/` on GitHub Pages or `/` locally. */
export const BASE = import.meta.env.BASE_URL

/** Bump when shipping new icons so OS / SW caches refresh. */
export const ICON_CACHE_VERSION = 'stint-3'

export function appPath(relative = ''): string {
  const clean = relative.replace(/^\//, '')
  return clean ? `${BASE}${clean}` : BASE
}

/** Absolute asset URL (needed for Windows notification / PWA icon resolution). */
export function absoluteAssetUrl(relative: string): string {
  const path = appPath(relative)
  const origin = typeof location !== 'undefined' ? location.origin : 'http://localhost'
  const url = new URL(path, origin)
  url.searchParams.set('v', ICON_CACHE_VERSION)
  return url.href
}

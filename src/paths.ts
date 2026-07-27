/** Vite base path, e.g. `/mvn/` on GitHub Pages or `/` locally. */
export const BASE = import.meta.env.BASE_URL

export function appPath(relative = ''): string {
  const clean = relative.replace(/^\//, '')
  return clean ? `${BASE}${clean}` : BASE
}

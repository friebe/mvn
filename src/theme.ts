/** Appearance: explicit light/dark, or follow the OS. */
export type ThemePreference = 'light' | 'dark' | 'system'

export type ResolvedTheme = 'light' | 'dark'

export const THEME_ORDER: ThemePreference[] = ['light', 'dark', 'system']

export const THEME_LABELS: Record<ThemePreference, string> = {
  light: 'Light',
  dark: 'Dark',
  system: 'System',
}

export const THEME_NOTES: Record<ThemePreference, string> = {
  light: 'Desk Daylight — cream paper, soft green ink.',
  dark: 'Desk Evening — warm dark, low glare for long sits.',
  system: 'Follows your OS light/dark setting.',
}

export function normalizeTheme(value: unknown): ThemePreference {
  if (value === 'light' || value === 'dark' || value === 'system') return value
  return 'system'
}

export function systemPrefersDark(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

export function resolveTheme(preference: ThemePreference): ResolvedTheme {
  if (preference === 'system') return systemPrefersDark() ? 'dark' : 'light'
  return preference
}

function syncThemeColorMeta(resolved: ResolvedTheme): void {
  const color = resolved === 'dark' ? '#0f1815' : '#141f1c'
  let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
  if (!meta) {
    meta = document.createElement('meta')
    meta.name = 'theme-color'
    document.head.appendChild(meta)
  }
  meta.content = color
}

/** Apply resolved theme to <html> (drives CSS tokens). */
export function applyTheme(preference: ThemePreference): ResolvedTheme {
  const resolved = resolveTheme(normalizeTheme(preference))
  document.documentElement.dataset.theme = resolved
  syncThemeColorMeta(resolved)
  return resolved
}

export function applyThemeFromState(state: { theme?: unknown }): ResolvedTheme {
  return applyTheme(normalizeTheme(state.theme))
}

/** Header toggle: flip between explicit light and dark (leaves System for Settings). */
export function nextThemeToggle(preference: ThemePreference): ThemePreference {
  return resolveTheme(normalizeTheme(preference)) === 'dark' ? 'light' : 'dark'
}

/** Keep system preference live when theme === system. */
export function bindSystemThemeListener(getPreference: () => ThemePreference): () => void {
  const mq = window.matchMedia('(prefers-color-scheme: dark)')
  const onChange = () => {
    if (getPreference() === 'system') applyTheme('system')
  }
  mq.addEventListener('change', onChange)
  return () => mq.removeEventListener('change', onChange)
}

import { writePreferences } from './preferences'
import { loadState } from './state'
import {
  applyTheme,
  nextThemeToggle,
  normalizeTheme,
  resolveTheme,
  type ThemePreference,
} from './theme'

const THEME_ICON_MOON =
  'M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10zm0-5a1 1 0 0 1 1 1v1a1 1 0 1 1-2 0V3a1 1 0 0 1 1-1zm0 17a1 1 0 0 1 1 1v1a1 1 0 1 1-2 0v-1a1 1 0 0 1 1-1zM3 11a1 1 0 0 1 1-1h1a1 1 0 1 1 0 2H4a1 1 0 0 1-1-1zm16 0a1 1 0 0 1 1-1h1a1 1 0 1 1 0 2h-1a1 1 0 0 1-1-1zM5.64 5.64a1 1 0 0 1 1.41 0l.71.71A1 1 0 1 1 6.35 7.76l-.71-.71a1 1 0 0 1 0-1.41zm11.31 11.31a1 1 0 0 1 1.41 0l.71.71a1 1 0 0 1-1.41 1.41l-.71-.71a1 1 0 0 1 0-1.41zM18.36 5.64a1 1 0 0 1 0 1.41l-.71.71a1 1 0 1 1-1.41-1.41l.71-.71a1 1 0 0 1 1.41 0zM6.35 16.24a1 1 0 0 1 0 1.41l-.71.71A1 1 0 0 1 4.22 17l.71-.71a1 1 0 0 1 1.42 0z'

const THEME_ICON_SUN =
  'M12 3a9 9 0 1 0 9 9c0-.46-.04-.91-.1-1.35a7 7 0 1 1-7.55-7.55C12.91 3.04 13.36 3 12 3z'

function currentPreference(): ThemePreference {
  return normalizeTheme(loadState().theme)
}

function isDarkResolved(): boolean {
  return resolveTheme(currentPreference()) === 'dark'
}

export function themeToggleButtonHtml(): string {
  const darkOn = isDarkResolved()
  return `
    <button
      type="button"
      class="icon-link"
      id="btn-theme"
      aria-label="${darkOn ? 'Switch to light theme' : 'Switch to dark theme'}"
      title="${darkOn ? 'Light' : 'Dark'}"
    >
      <svg class="icon" viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false">
        <path id="icon-theme-path" fill="currentColor" d="${darkOn ? THEME_ICON_MOON : THEME_ICON_SUN}" />
      </svg>
    </button>
  `
}

export function syncThemeToggle(root: HTMLElement): void {
  const btn = root.querySelector<HTMLButtonElement>('#btn-theme')
  const path = root.querySelector<SVGPathElement>('#icon-theme-path')
  if (!btn || !path) return

  const darkOn = isDarkResolved()
  path.setAttribute('d', darkOn ? THEME_ICON_MOON : THEME_ICON_SUN)
  btn.setAttribute('aria-label', darkOn ? 'Switch to light theme' : 'Switch to dark theme')
  btn.title = darkOn ? 'Light' : 'Dark'
}

export function bindThemeToggle(root: HTMLElement): void {
  root.querySelector<HTMLButtonElement>('#btn-theme')?.addEventListener('click', () => {
    const next = nextThemeToggle(currentPreference())
    writePreferences({ theme: next })
    applyTheme(next)
    syncThemeToggle(root)
  })
}

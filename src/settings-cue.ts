import { SETTINGS_SEEN_KEY } from './storage-keys'

export function hasSeenSettings(): boolean {
  try {
    return localStorage.getItem(SETTINGS_SEEN_KEY) === '1'
  } catch {
    return true
  }
}

export function markSettingsSeen(): void {
  try {
    localStorage.setItem(SETTINGS_SEEN_KEY, '1')
  } catch {
    // ignore
  }
}

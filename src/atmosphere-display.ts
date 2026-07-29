import type { AtmosphereDisplay } from './state'

export const ATMOSPHERE_DISPLAY_ORDER: AtmosphereDisplay[] = ['soft', 'clock', 'percent', 'bar']

export const ATMOSPHERE_DISPLAY_LABELS: Record<AtmosphereDisplay, string> = {
  soft: 'Soft text',
  clock: 'Time left',
  percent: 'Percent',
  bar: 'Status bar only',
}

export const ATMOSPHERE_DISPLAY_NOTES: Record<AtmosphereDisplay, string> = {
  soft: 'Atmosphere words — no exam clock.',
  clock: 'Exact mm:ss left in this block — not a focus timer.',
  percent: 'Remaining share of the current block.',
  bar: 'Progress bar only — no headline text.',
}

export function cycleAtmosphereDisplay(current: AtmosphereDisplay): AtmosphereDisplay {
  const i = ATMOSPHERE_DISPLAY_ORDER.indexOf(current)
  return ATMOSPHERE_DISPLAY_ORDER[(i + 1) % ATMOSPHERE_DISPLAY_ORDER.length]!
}

export function isBarOnly(display: AtmosphereDisplay): boolean {
  return display === 'bar'
}

export function detailMode(display: AtmosphereDisplay): 'soft' | 'clock' | 'percent' {
  return display === 'bar' ? 'soft' : display
}

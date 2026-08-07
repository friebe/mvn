import type { ActivePhase } from './state'

export interface IntervalPreset {
  sit: number
  stand: number
  reset: number
}

/** Custom sit/stand/reset — flat (no High/Lazy split). */
export type UserIntervals = IntervalPreset

/** Legacy dual-mode shape from older installs. */
type LegacyDualIntervals = {
  high?: Partial<IntervalPreset>
  lazy?: Partial<IntervalPreset>
}

const MIN = 60_000
const SEC = 1_000

export const PRESETS: IntervalPreset = {
  sit: 30 * MIN,
  stand: 5 * MIN,
  reset: 1 * MIN,
}

export const DEMO_PRESETS: IntervalPreset = {
  sit: 20 * SEC,
  stand: 12 * SEC,
  reset: 8 * SEC,
}

export const SIT_OPTIONS: number[] = [20, 25, 30, 35, 40, 45, 50, 60, 75, 90]
export const STAND_OPTIONS: number[] = [3, 5, 7, 10, 12, 15, 20]
export const RESET_OPTIONS: number[] = [1, 2, 3, 5]

export function defaultIntervals(): UserIntervals {
  return { ...PRESETS }
}

function isFlatPreset(value: unknown): value is IntervalPreset {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  return (
    typeof v.sit === 'number' &&
    typeof v.stand === 'number' &&
    typeof v.reset === 'number' &&
    !('high' in v) &&
    !('lazy' in v)
  )
}

/** Flatten legacy `{ high, lazy }` or keep flat preset. */
export function migrateIntervals(
  raw: unknown,
  legacyMode?: string | null,
): UserIntervals | null {
  if (raw == null) return null
  if (isFlatPreset(raw)) return { ...PRESETS, ...raw }

  const dual = raw as LegacyDualIntervals
  if (dual.high || dual.lazy) {
    const preferLazy = legacyMode === 'lazy' && dual.lazy
    const source = preferLazy ? dual.lazy : dual.high ?? dual.lazy
    if (!source) return null
    return { ...PRESETS, ...source }
  }
  return null
}

export function resolveIntervals(custom: UserIntervals | null | undefined): UserIntervals {
  if (!custom) return defaultIntervals()
  return { ...PRESETS, ...custom }
}

export function intervalsEqual(a: UserIntervals, b: UserIntervals): boolean {
  return a.sit === b.sit && a.stand === b.stand && a.reset === b.reset
}

export function normalizeStoredIntervals(
  custom: UserIntervals | null | undefined,
): UserIntervals | null {
  if (!custom) return null
  const resolved = resolveIntervals(custom)
  return intervalsEqual(resolved, defaultIntervals()) ? null : resolved
}

export function msFromMinutes(minutes: number): number {
  return minutes * MIN
}

export function minutesFromMs(ms: number): number {
  return Math.round(ms / MIN)
}

export function intervalSummary(intervals: UserIntervals): string {
  const sit = `${minutesFromMs(intervals.sit)}\u00A0min sit`
  const stand = `${minutesFromMs(intervals.stand)}\u00A0min stand`
  return `${sit} → micro-move → ${stand}`
}

export function durationFor(
  phase: ActivePhase,
  demo: boolean,
  customIntervals?: UserIntervals | null,
): number {
  if (demo) return DEMO_PRESETS[phase]
  return resolveIntervals(customIntervals)[phase]
}

export function formatDurationHint(ms: number, demo: boolean): string {
  if (demo) return `${Math.round(ms / SEC)}s`
  const min = Math.round(ms / MIN)
  return min < 1 ? `${Math.round(ms / SEC)}s` : `${min} Min.`
}

import type { ActivePhase, EnergyMode } from './state'

export interface IntervalPreset {
  sit: number
  stand: number
  reset: number
}

export type UserIntervals = Record<EnergyMode, IntervalPreset>

const MIN = 60_000
const SEC = 1_000

export const PRESETS: Record<EnergyMode, IntervalPreset> = {
  high: {
    sit: 30 * MIN,
    stand: 5 * MIN,
    reset: 1 * MIN,
  },
  lazy: {
    sit: 20 * MIN,
    stand: 3 * MIN,
    reset: 1 * MIN,
  },
}

export const DEMO_PRESETS: Record<EnergyMode, IntervalPreset> = {
  high: {
    sit: 20 * SEC,
    stand: 12 * SEC,
    reset: 8 * SEC,
  },
  lazy: {
    sit: 15 * SEC,
    stand: 10 * SEC,
    reset: 8 * SEC,
  },
}

export const SIT_OPTIONS: Record<EnergyMode, number[]> = {
  high: [20, 25, 30, 35, 40, 45, 50, 60, 75, 90],
  lazy: [15, 20, 25, 30, 35, 40, 45, 50],
}

export const STAND_OPTIONS: Record<EnergyMode, number[]> = {
  high: [3, 5, 7, 10, 12, 15, 20],
  lazy: [2, 3, 5, 7, 10, 12],
}

export const RESET_OPTIONS: Record<EnergyMode, number[]> = {
  high: [1, 2, 3, 5],
  lazy: [1, 2, 3],
}

export function defaultIntervals(): UserIntervals {
  return {
    high: { ...PRESETS.high },
    lazy: { ...PRESETS.lazy },
  }
}

export function resolveIntervals(custom: UserIntervals | null | undefined): UserIntervals {
  if (!custom) return defaultIntervals()
  return {
    high: { ...PRESETS.high, ...custom.high },
    lazy: { ...PRESETS.lazy, ...custom.lazy },
  }
}

export function intervalsEqual(a: UserIntervals, b: UserIntervals): boolean {
  for (const mode of ['high', 'lazy'] as const) {
    for (const phase of ['sit', 'stand', 'reset'] as const) {
      if (a[mode][phase] !== b[mode][phase]) return false
    }
  }
  return true
}

export function normalizeStoredIntervals(custom: UserIntervals | null | undefined): UserIntervals | null {
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

export function intervalSummary(intervals: UserIntervals, mode: EnergyMode): string {
  const p = intervals[mode]
  const sit = `${minutesFromMs(p.sit)}\u00A0min sit`
  const stand = `${minutesFromMs(p.stand)}\u00A0min stand`
  return `${sit} → micro-move → ${stand}`
}

export function durationFor(
  mode: EnergyMode,
  phase: ActivePhase,
  demo: boolean,
  customIntervals?: UserIntervals | null,
): number {
  if (demo) return DEMO_PRESETS[mode][phase]
  return resolveIntervals(customIntervals)[mode][phase]
}

export function formatDurationHint(ms: number, demo: boolean): string {
  if (demo) return `${Math.round(ms / SEC)}s`
  const min = Math.round(ms / MIN)
  return min < 1 ? `${Math.round(ms / SEC)}s` : `${min} Min.`
}

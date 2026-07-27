import type { ActivePhase, EnergyMode } from './state'

export interface IntervalPreset {
  sit: number
  stand: number
  reset: number
}

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

/** Short intervals for UI testing — no 30‑min wait. */
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

export const DEMO_EXERCISE_MS = 8 * SEC
export const DEMO_FREEZE_PROMPT_MS = 12 * SEC
export const DEMO_FREEZE_EXTEND_MS = 10 * SEC

export function durationFor(mode: EnergyMode, phase: ActivePhase, demo: boolean): number {
  const presets = demo ? DEMO_PRESETS : PRESETS
  return presets[mode][phase]
}

export function nextActivePhase(phase: ActivePhase): ActivePhase {
  if (phase === 'sit') return 'stand'
  if (phase === 'stand') return 'reset'
  return 'sit'
}

export function phaseLabel(
  phase: ActivePhase | 'threshold' | 'confirm' | 'exercise' | 'frozen' | 'closing' | 'setup',
): string {
  switch (phase) {
    case 'sit':
      return 'Sitzen'
    case 'stand':
      return 'Stehen'
    case 'reset':
      return 'Reset'
    case 'threshold':
      return 'Schwelle'
    case 'confirm':
      return 'Beweis'
    case 'exercise':
      return 'Ritual'
    case 'frozen':
      return 'Freeze'
    case 'closing':
      return 'Tagesende'
    case 'setup':
      return 'Setup'
  }
}

export function nextPhaseVerb(phase: ActivePhase): string {
  if (phase === 'sit') return 'Hochfahren'
  if (phase === 'stand') return 'Reset'
  return 'Wieder setzen'
}

export function confirmCopy(ended: ActivePhase | null): { lead: string; sub: string; yes: string } {
  if (ended === 'stand') {
    return {
      lead: 'Reset erledigt?',
      sub: 'Ein Tap macht daraus einen echten Wechsel — nicht nur einen Timer-Klick.',
      yes: 'Erledigt',
    }
  }
  if (ended === 'reset') {
    return {
      lead: 'Wieder gesetzt?',
      sub: 'Kurzer Beweis, dass du den Wechsel wirklich gemacht hast.',
      yes: 'Gesetzt',
    }
  }
  return {
    lead: 'Tisch steht?',
    sub: 'Ohne Bestätigung zählt die Runde nicht als echt. Ein Tap reicht.',
    yes: 'Tisch steht',
  }
}

export function formatDurationHint(ms: number, demo: boolean): string {
  if (demo) return `${Math.round(ms / 1000)}s`
  const min = Math.round(ms / MIN)
  return min < 1 ? `${Math.round(ms / 1000)}s` : `${min} Min.`
}

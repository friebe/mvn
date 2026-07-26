import type { ActivePhase, EnergyMode } from './state'

export interface IntervalPreset {
  sit: number
  stand: number
  reset: number
}

const MIN = 60_000

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

export function durationFor(mode: EnergyMode, phase: ActivePhase): number {
  return PRESETS[mode][phase]
}

export function nextActivePhase(phase: ActivePhase): ActivePhase {
  if (phase === 'sit') return 'stand'
  if (phase === 'stand') return 'reset'
  return 'sit'
}

export function phaseLabel(phase: ActivePhase | 'exercise' | 'frozen' | 'setup'): string {
  switch (phase) {
    case 'sit':
      return 'Sitzen'
    case 'stand':
      return 'Stehen'
    case 'reset':
      return 'Reset'
    case 'exercise':
      return 'Mikro-Übung'
    case 'frozen':
      return 'Freeze'
    case 'setup':
      return 'Setup'
  }
}

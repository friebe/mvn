import type { ActivePhase } from './state'

export {
  DEMO_PRESETS,
  durationFor,
  formatDurationHint,
  PRESETS,
  type IntervalPreset,
} from './intervals'

const SEC = 1_000

export const DEMO_EXERCISE_MS = 5 * SEC
export const DEMO_FREEZE_PROMPT_MS = 12 * SEC
export const DEMO_FREEZE_EXTEND_MS = 10 * SEC

export function nextActivePhase(phase: ActivePhase): ActivePhase {
  if (phase === 'sit') return 'stand'
  return 'sit'
}

export function phaseLabel(
  phase:
    | ActivePhase
    | 'threshold'
    | 'pick'
    | 'exercise'
    | 'frozen'
    | 'closing'
    | 'setup',
): string {
  switch (phase) {
    case 'sit':
      return 'Sitzen'
    case 'stand':
      return 'Stehen'
    case 'reset':
      return 'Reset'
    case 'threshold':
      return 'Tisch'
    case 'pick':
      return 'Moment'
    case 'exercise':
      return 'Moment'
    case 'frozen':
      return 'Freeze'
    case 'closing':
      return 'Tagesende'
    case 'setup':
      return 'Setup'
  }
}

export function nextPhaseVerb(phase: ActivePhase): string {
  if (phase === 'sit') return 'Tisch hoch'
  return 'Wieder setzen'
}

export function thresholdLead(ended: ActivePhase | null): string {
  if (ended === 'sit') return 'Tisch will hoch.'
  if (ended === 'stand' || ended === 'reset') return 'Wieder setzen?'
  return 'Tisch wartet.'
}

export function thresholdSub(ended: ActivePhase | null): string {
  if (ended === 'sit') return 'Tisch hochfahren und kurz bewegen — oder gleich stehen.'
  if (ended === 'stand' || ended === 'reset') return 'Tisch runter und kurz bewegen — oder gleich setzen.'
  return 'Du musst nichts beweisen. Wähl den Weg, der heute geht.'
}

export function pickLead(pendingNext: ActivePhase | null): string {
  if (pendingNext === 'sit') return 'Tisch runterfahren und kurz bewegen.'
  return 'Tisch hochfahren und kurz bewegen.'
}

/** Short orientation while a moment runs. */
export function momentOrderHint(pendingNext: ActivePhase | null): string {
  if (pendingNext === 'sit') return 'Knopf runter und kurz bewegen — in einem.'
  if (pendingNext === 'stand') return 'Knopf hoch und kurz bewegen — in einem.'
  return 'Kurz. Erledigt, wenn du fertig bist.'
}

export function skipMomentLabel(pendingNext: ActivePhase | null): string {
  if (pendingNext === 'sit') return 'Heute reicht Sitzen'
  return 'Heute reicht Stehen'
}

/** Direct path at threshold — matches „oder direkt setzen/stehen“. */
export function thresholdSkipLabel(pendingNext: ActivePhase | null): string {
  if (pendingNext === 'sit') return 'Einfach setzen'
  return 'Einfach stehen'
}

export function thresholdRiseLabel(ended: ActivePhase | null): string {
  if (ended === 'sit' || ended === 'stand' || ended === 'reset') return 'Kurz bewegen'
  return 'Weiter'
}

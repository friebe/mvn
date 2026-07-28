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
  if (phase === 'stand') return 'reset'
  return 'sit'
}

export function phaseLabel(
  phase:
    | ActivePhase
    | 'threshold'
    | 'confirm'
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
    case 'confirm':
      return 'Beweis'
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
  if (phase === 'stand') return 'Reset'
  return 'Wieder setzen'
}

export function confirmCopy(ended: ActivePhase | null): { lead: string; sub: string; yes: string } {
  if (ended === 'stand') {
    return {
      lead: 'Reset erledigt?',
      sub: 'Ein Tap — der Tisch merkt den Unterschied zum reinen Timer-Klick.',
      yes: 'Erledigt',
    }
  }
  if (ended === 'reset') {
    return {
      lead: 'Wieder gesetzt?',
      sub: 'Kurzer Beweis, dass der Wechsel echt war.',
      yes: 'Gesetzt',
    }
  }
  return {
    lead: 'Tisch steht?',
    sub: 'Ohne Bestätigung zählt die Runde nicht als echt. Ein Tap reicht.',
    yes: 'Tisch steht',
  }
}

export function thresholdLead(ended: ActivePhase | null): string {
  if (ended === 'sit') return 'Tisch will hoch.'
  if (ended === 'stand') return 'Tisch wartet auf Reset.'
  if (ended === 'reset') return 'Wieder setzen?'
  return 'Tisch wartet.'
}

export function thresholdSub(ended: ActivePhase | null): string {
  if (ended === 'sit') return 'Kurz bewegen — oder einfach stehen.'
  if (ended === 'stand') return 'Kurze Reset-Phase. Kein Moment nötig.'
  if (ended === 'reset') return 'Kurz bewegen — oder direkt setzen.'
  return 'Du musst nichts beweisen. Wähl den Weg, der heute geht.'
}

export function pickLead(pendingNext: ActivePhase | null): string {
  if (pendingNext === 'sit') return 'Kurz bewegen, bevor du dich setzt.'
  return 'Kurz bewegen, bevor du hochgehst.'
}

export function skipMomentLabel(pendingNext: ActivePhase | null): string {
  if (pendingNext === 'sit') return 'Heute reicht Sitzen'
  return 'Heute reicht Stehen'
}

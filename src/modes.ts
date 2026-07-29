import type { ActivePhase } from './state'
import {
  copyKey,
  pickCopy,
  PICK_LEAD_DOWN,
  PICK_LEAD_UP,
  RUNNING_HINTS_HIGH,
  RUNNING_HINTS_LAZY,
  THRESHOLD_LEAD_DOWN,
  THRESHOLD_LEAD_SIT,
  THRESHOLD_SUB_DOWN,
  THRESHOLD_SUB_UP,
} from './copy'

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
      return 'Sitting'
    case 'stand':
      return 'Standing'
    case 'reset':
      return 'Reset'
    case 'threshold':
      return 'Desk'
    case 'pick':
      return 'Moment'
    case 'exercise':
      return 'Moment'
    case 'frozen':
      return 'Freeze'
    case 'closing':
      return 'Day end'
    case 'setup':
      return 'Ready'
  }
}

export function nextPhaseVerb(phase: ActivePhase): string {
  if (phase === 'sit') return 'Desk up'
  return 'Sit again'
}

export function thresholdLead(ended: ActivePhase | null, at = new Date()): string {
  if (ended === 'sit') return pickCopy(THRESHOLD_LEAD_SIT, copyKey('threshold-lead-up', at))
  if (ended === 'stand' || ended === 'reset') {
    return pickCopy(THRESHOLD_LEAD_DOWN, copyKey('threshold-lead-down', at))
  }
  return 'Desk is waiting.'
}

export function thresholdSub(ended: ActivePhase | null, at = new Date()): string {
  if (ended === 'sit') return pickCopy(THRESHOLD_SUB_UP, copyKey('threshold-sub-up', at))
  if (ended === 'stand' || ended === 'reset') {
    return pickCopy(THRESHOLD_SUB_DOWN, copyKey('threshold-sub-down', at))
  }
  return 'Nothing to prove. Pick what works today.'
}

export function pickLead(pendingNext: ActivePhase | null, at = new Date()): string {
  if (pendingNext === 'sit') return pickCopy(PICK_LEAD_DOWN, copyKey('pick-lead-down', at))
  return pickCopy(PICK_LEAD_UP, copyKey('pick-lead-up', at))
}

export function runningPhaseHint(lazy: boolean, at = new Date()): string {
  const variants = lazy ? RUNNING_HINTS_LAZY : RUNNING_HINTS_HIGH
  return pickCopy(variants, copyKey(lazy ? 'hint-lazy' : 'hint-high', at))
}

/** Short orientation while a moment runs. */
export function momentOrderHint(pendingNext: ActivePhase | null): string {
  if (pendingNext === 'sit') return 'Desk button down and a short move — together.'
  if (pendingNext === 'stand') return 'Desk button up and a short move — together.'
  return 'Keep it short. Done when you are.'
}

export function skipMomentLabel(pendingNext: ActivePhase | null): string {
  if (pendingNext === 'sit') return 'Sitting is enough today'
  return 'Standing is enough today'
}

/** Direct path at threshold — matches “or just sit/stand”. */
export function thresholdSkipLabel(pendingNext: ActivePhase | null): string {
  if (pendingNext === 'sit') return 'Just sit'
  return 'Just stand'
}

export function thresholdRiseLabel(ended: ActivePhase | null): string {
  if (ended === 'sit' || ended === 'stand' || ended === 'reset') return 'Move briefly'
  return 'Continue'
}

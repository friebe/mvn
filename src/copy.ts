import { todayKey } from './stats'

/** Stable pick from variants — same key returns same line for the day. */
export function pickCopy<T extends string>(variants: readonly T[], key: string): T {
  let hash = 0
  for (let i = 0; i < key.length; i++) {
    hash = (hash * 31 + key.charCodeAt(i)) | 0
  }
  return variants[Math.abs(hash) % variants.length]!
}

export function copyKey(suffix: string, at = new Date()): string {
  return `${todayKey(at)}-${suffix}`
}

export const THRESHOLD_LEAD_SIT = [
  'Desk wants up.',
  'Sitting block done.',
  'Time to rise.',
  'The desk is asking.',
  'Up next: standing.',
] as const

export const THRESHOLD_LEAD_DOWN = [
  'Sit again?',
  'Standing block done.',
  'Lower the desk?',
  'Ready to sit.',
  'The chair is waiting.',
] as const

export const THRESHOLD_SUB_UP = [
  'Raise the desk and move briefly — or just stand.',
  'Desk button up — a short move or straight to standing.',
  'Nothing heroic. Up, maybe move, maybe not.',
  'Stand if you can. A moment is optional.',
  'Your call: desk up with or without a move.',
] as const

export const THRESHOLD_SUB_DOWN = [
  'Lower the desk and move briefly — or just sit.',
  'Desk button down — a short move or straight to sitting.',
  'Nothing heroic. Down, maybe move, maybe not.',
  'Sit if you need to. A moment is optional.',
  'Your call: desk down with or without a move.',
] as const

export const PICK_LEAD_UP = [
  'Raise the desk and move briefly.',
  'Desk up — pick a short move.',
  'Up and a tiny move.',
  'Stand up. One small thing.',
] as const

export const PICK_LEAD_DOWN = [
  'Lower the desk and move briefly.',
  'Desk down — pick a short move.',
  'Down and a tiny move.',
  'Sit down. One small thing.',
] as const

export const RUNNING_HINTS_LAZY = [
  'Lazy Mode — the bar stays low.',
  'Survival mode. Small counts.',
  'Low bar today — still a win.',
] as const

export const RUNNING_HINTS_HIGH = [
  'Long sit block — micro-move only when the desk switches.',
  'Body maintenance, not a focus timer.',
  'Sit · move · sit again. The desk keeps the rhythm.',
  'Maintenance, not performance.',
] as const

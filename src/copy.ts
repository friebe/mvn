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
  'Desk up — one random moment from your pool, or Ritual for a habit.',
  'Raise the desk. Tap the offer, Ritual, or just stand.',
  'Up first. A short move is optional — skip is fine.',
  'Stand when ready. One offer or a ritual habit — your call.',
  'Desk button up. Random from your pool — or water instead.',
] as const

export const THRESHOLD_SUB_DOWN = [
  'Desk down — one random moment from your pool, or Ritual for a habit.',
  'Lower the desk. Tap the offer, Ritual, or just sit.',
  'Down first. A short move is optional — skip is fine.',
  'Sit when ready. One offer or a ritual habit — your call.',
  'Desk button down. Random from your pool — or water instead.',
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

export const RUNNING_HINTS = [
  'Long sit block — micro-move only when the desk switches.',
  'Body maintenance, not a focus timer.',
  'Sit · move · sit again. The desk keeps the rhythm.',
  'Maintenance, not performance.',
  'Small counts. The desk keeps the beat.',
] as const

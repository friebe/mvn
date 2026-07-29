import type { MomentKind, MomentPart } from './exercises'

const WEEK_THEMES: MomentPart[][] = [
  ['neck', 'eyes'],
  ['shoulders', 'wrists'],
  ['back', 'hips'],
  ['legs', 'feet'],
  ['eyes', 'breath'],
  ['neck', 'jaw'],
  ['shoulders', 'back'],
]

function isoWeek(d = new Date()): number {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7))
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1))
  return Math.ceil(((date.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7)
}

export function weekFocusParts(at = new Date()): MomentPart[] {
  return WEEK_THEMES[isoWeek(at) % WEEK_THEMES.length]!
}

const PART_LABEL: Partial<Record<MomentPart, string>> = {
  neck: 'neck',
  eyes: 'eyes',
  shoulders: 'shoulders',
  wrists: 'wrists',
  back: 'back',
  hips: 'hips',
  legs: 'legs',
  feet: 'feet',
  breath: 'breath',
  jaw: 'jaw',
}

export function weekFocusLabel(at = new Date()): string {
  const parts = weekFocusParts(at)
  const labels = parts.map((p) => PART_LABEL[p] ?? p)
  return labels.join(' & ')
}

export function momentMatchesFocus(
  part: MomentPart,
  kind: MomentKind,
  focus: MomentPart[],
): boolean {
  if (focus.includes(part)) return true
  if (kind === 'eyes' && focus.includes('eyes')) return true
  if (kind === 'breath' && focus.includes('breath')) return true
  return false
}

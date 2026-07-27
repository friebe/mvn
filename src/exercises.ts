import type { EnergyMode } from './state'
import momentsJson from './moments.json'

export type MomentKind = 'body' | 'eyes' | 'breath' | 'desk' | 'play'

export type MomentPart =
  | 'neck'
  | 'shoulders'
  | 'wrists'
  | 'hands'
  | 'forearms'
  | 'chest'
  | 'back'
  | 'hips'
  | 'glutes'
  | 'legs'
  | 'calves'
  | 'feet'
  | 'jaw'
  | 'eyes'
  | 'breath'
  | 'desk'
  | 'play'

export type MomentPosture = 'sit' | 'stand' | 'either'

export interface Moment {
  id: string
  mode: EnergyMode | 'both'
  kind: MomentKind
  part: MomentPart
  posture: MomentPosture
  title: string
  prompt: string
}

/** Micro-moments (~15s) — edit [`moments.json`](./moments.json) to extend. */
export const MOMENTS: Moment[] = momentsJson as Moment[]

const KIND_LABEL: Record<MomentKind, string> = {
  body: 'Körper',
  eyes: 'Augen',
  breath: 'Atem',
  desk: 'Desk',
  play: 'Play',
}

export function kindLabel(kind: MomentKind): string {
  return KIND_LABEL[kind]
}

export function getMoment(id: string | null | undefined): Moment | undefined {
  if (!id) return undefined
  return MOMENTS.find((m) => m.id === id)
}

function poolFor(mode: EnergyMode, kind?: MomentKind): Moment[] {
  return MOMENTS.filter(
    (m) => (m.mode === mode || m.mode === 'both') && (kind == null || m.kind === kind),
  )
}

export function pickMoment(mode: EnergyMode, recentIds: string[], kind?: MomentKind): Moment {
  const pool = poolFor(mode, kind)
  const fresh = pool.filter((m) => !recentIds.includes(m.id))
  const candidates = fresh.length > 0 ? fresh : pool.length > 0 ? pool : MOMENTS
  return candidates[Math.floor(Math.random() * candidates.length)]!
}

/** Prefer distinct body parts when filling the body slot. */
function pickMomentAvoidingParts(
  mode: EnergyMode,
  recentIds: string[],
  kind: MomentKind,
  usedParts: Set<MomentPart>,
): Moment {
  const pool = poolFor(mode, kind)
  const fresh = pool.filter((m) => !recentIds.includes(m.id) && !usedParts.has(m.part))
  const candidates =
    fresh.length > 0
      ? fresh
      : pool.filter((m) => !recentIds.includes(m.id)).length > 0
        ? pool.filter((m) => !recentIds.includes(m.id))
        : pool.length > 0
          ? pool
          : MOMENTS
  return candidates[Math.floor(Math.random() * candidates.length)]!
}

/** Three choices: prefer body / eyes / play-or-desk diversity. */
export function pickMomentCards(mode: EnergyMode, recentIds: string[]): Moment[] {
  const preferred: MomentKind[] = ['body', 'eyes', Math.random() > 0.5 ? 'play' : 'desk']
  const picked: Moment[] = []
  const used = new Set<string>()
  const usedParts = new Set<MomentPart>()

  for (const kind of preferred) {
    const m =
      kind === 'body'
        ? pickMomentAvoidingParts(mode, [...recentIds, ...used], kind, usedParts)
        : pickMoment(mode, [...recentIds, ...used], kind)
    if (!used.has(m.id)) {
      picked.push(m)
      used.add(m.id)
      usedParts.add(m.part)
    }
  }

  while (picked.length < 3) {
    const m = pickMomentAvoidingParts(mode, [...recentIds, ...used], 'body', usedParts)
    if (used.has(m.id)) {
      const fallback =
        poolFor(mode).find((x) => !used.has(x.id)) ?? MOMENTS.find((x) => !used.has(x.id))
      if (!fallback) break
      picked.push(fallback)
      used.add(fallback.id)
      usedParts.add(fallback.part)
    } else {
      picked.push(m)
      used.add(m.id)
      usedParts.add(m.part)
    }
  }

  return picked.slice(0, 3)
}

export function rememberId(recent: string[], id: string, max = 8): string[] {
  return [id, ...recent.filter((x) => x !== id)].slice(0, max)
}

/** @deprecated Use MOMENTS / pickMoment — kept for any leftover imports */
export const EXERCISES = MOMENTS.map((m) => ({
  id: m.id,
  mode: m.mode,
  title: m.title,
  hint: m.prompt,
}))

export function pickExercise(mode: EnergyMode, recentIds: string[]) {
  return pickMoment(mode, recentIds)
}

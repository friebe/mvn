import momentsJson from './moments.json'
import { isLongMomentDuration } from './intervals'

export type MomentKind = 'body' | 'eyes' | 'desk'

export type MomentDepth = 'quick' | 'hold' | 'any'

export type MomentPart = 'neck' | 'shoulders' | 'back' | 'eyes' | 'desk'

export type MomentPosture = 'sit' | 'stand' | 'either'

export interface Moment {
  id: string
  kind: MomentKind
  part: MomentPart
  posture: MomentPosture
  depth: MomentDepth
  title: string
  prompt: string
  promptLong?: string
}

/** Micro-moments (15–45s in settings) — edit [`moments.json`](./moments.json) to extend. */
export const MOMENTS: Moment[] = momentsJson as Moment[]

const CORE_PARTS: MomentPart[] = ['neck', 'shoulders', 'back']

const KIND_LABEL: Record<MomentKind, string> = {
  body: 'Körper',
  eyes: 'Augen',
  desk: 'Ritual',
}

export function kindLabel(kind: MomentKind): string {
  return KIND_LABEL[kind]
}

export function momentPrompt(moment: Moment, durationMs: number): string {
  if (isLongMomentDuration(durationMs) && moment.promptLong) return moment.promptLong
  return moment.prompt
}

export function getMoment(id: string | null | undefined): Moment | undefined {
  if (!id) return undefined
  return MOMENTS.find((m) => m.id === id)
}

function matchesPosture(moment: Moment, nextPosture: 'sit' | 'stand'): boolean {
  return moment.posture === 'either' || moment.posture === nextPosture
}

function matchesDepth(moment: Moment, durationMs: number): boolean {
  if (moment.depth === 'any') return true
  const long = isLongMomentDuration(durationMs)
  return long ? moment.depth === 'hold' : moment.depth === 'quick'
}

function poolFor(
  kind?: MomentKind,
  nextPosture?: 'sit' | 'stand',
  durationMs?: number,
): Moment[] {
  let pool = kind == null ? MOMENTS : MOMENTS.filter((m) => m.kind === kind)
  if (nextPosture) pool = pool.filter((m) => matchesPosture(m, nextPosture))
  if (durationMs != null) {
    const byDepth = pool.filter((m) => matchesDepth(m, durationMs))
    if (byDepth.length > 0) pool = byDepth
  }
  return pool
}

function preferFresh(pool: Moment[], recentIds: string[]): Moment[] {
  const fresh = pool.filter((m) => !recentIds.includes(m.id))
  return fresh.length > 0 ? fresh : pool.length > 0 ? pool : MOMENTS
}

function pickRandom(candidates: Moment[]): Moment {
  return candidates[Math.floor(Math.random() * candidates.length)]!
}

export function pickMoment(
  recentIds: string[],
  kind?: MomentKind,
  nextPosture?: 'sit' | 'stand',
  durationMs?: number,
): Moment {
  const pool = poolFor(kind, nextPosture, durationMs)
  const candidates = preferFresh(pool, recentIds)
  return pickRandom(
    candidates.length > 0 ? candidates : poolFor(undefined, nextPosture, durationMs),
  )
}

function pickMomentAvoidingParts(
  recentIds: string[],
  usedParts: Set<MomentPart>,
  opts: {
    kind?: MomentKind
    parts?: MomentPart[]
    nextPosture?: 'sit' | 'stand'
    durationMs?: number
  } = {},
): Moment {
  const { kind, parts, nextPosture, durationMs } = opts
  let pool = poolFor(kind, nextPosture, durationMs)
  if (parts?.length) pool = pool.filter((m) => parts.includes(m.part))

  const fresh = pool.filter((m) => !recentIds.includes(m.id) && !usedParts.has(m.part))
  if (fresh.length > 0) return pickRandom(fresh)

  const byPart = pool.filter((m) => !usedParts.has(m.part))
  const partCandidates = preferFresh(byPart, recentIds)
  if (partCandidates.length > 0) return pickRandom(partCandidates)

  return pickRandom(preferFresh(pool, recentIds))
}

/** Three choices: two core desk zones, third slot sometimes ritual or eyes. */
export function pickMomentCards(
  recentIds: string[],
  nextPosture: 'sit' | 'stand' = 'stand',
  durationMs?: number,
): Moment[] {
  const picked: Moment[] = []
  const used = new Set<string>()
  const usedParts = new Set<MomentPart>()
  const exclude = () => [...recentIds, ...used]

  for (let i = 0; i < 2; i++) {
    const m = pickMomentAvoidingParts(exclude(), usedParts, {
      kind: 'body',
      parts: CORE_PARTS,
      nextPosture,
      durationMs,
    })
    picked.push(m)
    used.add(m.id)
    usedParts.add(m.part)
  }

  const roll = Math.random()
  let third: Moment
  if (roll < 0.28) {
    third = pickMoment(exclude(), 'desk', nextPosture, durationMs)
  } else if (roll < 0.45) {
    third = pickMoment(exclude(), 'eyes', nextPosture, durationMs)
  } else {
    third = pickMomentAvoidingParts(exclude(), usedParts, { nextPosture, durationMs })
  }

  if (!used.has(third.id)) {
    picked.push(third)
  } else {
    const fallback = poolFor(undefined, nextPosture, durationMs).find((m) => !used.has(m.id))
    if (fallback) picked.push(fallback)
  }

  while (picked.length < 3) {
    const m = pickMomentAvoidingParts(exclude(), usedParts, { nextPosture, durationMs })
    if (used.has(m.id)) break
    picked.push(m)
    used.add(m.id)
    usedParts.add(m.part)
  }

  return picked.slice(0, 3)
}

/** Avoid immediate repeats — pool is small (8 moments). */
export function rememberId(recent: string[], id: string, max = 6): string[] {
  return [id, ...recent.filter((x) => x !== id)].slice(0, max)
}

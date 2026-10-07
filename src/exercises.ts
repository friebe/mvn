import momentsJson from './moments.json'
import { isLongMomentDuration } from './intervals'
import { rhythmMoments } from './moment-packs'

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
  figureId?: string
  title: string
  prompt: string
  promptLong?: string
  /** Pack player: beep at halfway so you change sides. */
  sideSwitch?: boolean
}

/** Micro-moments (15–45s in settings) — edit [`moments.json`](./moments.json) to extend. */
export const MOMENTS: Moment[] = momentsJson as Moment[]

function momentPool(): Moment[] {
  return rhythmMoments()
}

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
  let pool = kind == null ? momentPool() : momentPool().filter((m) => m.kind === kind)
  if (nextPosture) pool = pool.filter((m) => matchesPosture(m, nextPosture))
  if (durationMs != null) {
    const byDepth = pool.filter((m) => matchesDepth(m, durationMs))
    if (byDepth.length > 0) pool = byDepth
  }
  return pool
}

function preferFresh(pool: Moment[], recentIds: string[]): Moment[] {
  const fresh = pool.filter((m) => !recentIds.includes(m.id))
  return fresh.length > 0 ? fresh : pool.length > 0 ? pool : momentPool()
}

function pickRandom(candidates: Moment[]): Moment | undefined {
  if (candidates.length === 0) return undefined
  return candidates[Math.floor(Math.random() * candidates.length)]
}

export function pickMoment(
  recentIds: string[],
  kind?: MomentKind,
  nextPosture?: 'sit' | 'stand',
  durationMs?: number,
): Moment | undefined {
  const pool = poolFor(kind, nextPosture, durationMs)
  return (
    pickRandom(preferFresh(pool, recentIds)) ??
    pickRandom(preferFresh(poolFor(undefined, nextPosture, durationMs), recentIds)) ??
    pickRandom(preferFresh(momentPool(), recentIds)) ??
    momentPool()[0]
  )
}

function pickFromPool(pool: Moment[], recentIds: string[]): Moment | undefined {
  if (pool.length === 0) return undefined
  return pickRandom(preferFresh(pool, recentIds))
}

/** Sit/stand favorites — no posture/depth filter so three cards stay fillable. */
function pickFromFavorites(
  pool: Moment[],
  recentIds: string[],
  used: Set<string>,
): Moment | undefined {
  const available = pool.filter((m) => !used.has(m.id))
  if (available.length === 0) return undefined
  return pickFromPool(available, recentIds)
}

/** Three choices: two random non-ritual favorites, then one ritual (desk) last. */
export function pickMomentCards(
  recentIds: string[],
  _nextPosture: 'sit' | 'stand' = 'stand',
  _durationMs?: number,
): Moment[] {
  const favorites = momentPool()
  const picked: Moment[] = []
  const used = new Set<string>()
  const exclude = () => [...recentIds, ...used]

  const addCard = (m: Moment | undefined): boolean => {
    if (!m || used.has(m.id)) return false
    picked.push(m)
    used.add(m.id)
    return true
  }

  const variablePool = () => favorites.filter((m) => m.kind !== 'desk')
  const ritualPool = () => favorites.filter((m) => m.kind === 'desk')

  for (let i = 0; i < 2; i++) {
    if (!addCard(pickFromFavorites(variablePool(), exclude(), used))) break
  }

  if (!addCard(pickFromFavorites(ritualPool(), exclude(), used))) {
    addCard(pickFromFavorites(variablePool(), exclude(), used))
  }

  return picked.slice(0, 3)
}

/** Avoid immediate repeats — pool is small. */
export function rememberId(recent: string[], id: string, max = 6): string[] {
  return [id, ...recent.filter((x) => x !== id)].slice(0, max)
}

import { getCustomRitualMoment } from './custom-ritual'
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
  const custom = getCustomRitualMoment()
  if (custom?.id === id) return custom
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

function pickRandomAvoiding(pool: Moment[], avoidId: string | null | undefined): Moment | undefined {
  if (pool.length === 0) return undefined
  const candidates =
    avoidId && pool.length > 1 ? pool.filter((m) => m.id !== avoidId) : pool
  return pickRandom(candidates.length > 0 ? candidates : pool)
}

/**
 * Desk switch: one random move from the checked pool, plus a ritual.
 * Each call draws again. Only the previous offer is skipped, so a shown card
 * does not stick for the rest of the day when it is not performed.
 */
export function pickThresholdOffers(
  nextPosture: 'sit' | 'stand',
  opts: { avoidOfferId?: string | null; avoidRitualId?: string | null } = {},
): { offer: Moment | undefined; ritualAlt: Moment | undefined } {
  const ritualPool = poolFor('desk', nextPosture)
  const ritualAlt = pickRandomAvoiding(ritualPool, opts.avoidRitualId)

  const movePool = poolFor(undefined, nextPosture).filter((m) => m.kind !== 'desk')
  const offer = pickRandomAvoiding(movePool, opts.avoidOfferId)

  return { offer, ritualAlt }
}

/** Avoid immediate repeats — pool is small. */
export function rememberId(recent: string[], id: string, max = 6): string[] {
  return [id, ...recent.filter((x) => x !== id)].slice(0, max)
}

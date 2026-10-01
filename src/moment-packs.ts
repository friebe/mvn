import momentsJson from './moments.json'
import type { Moment } from './exercises'
import { LOOP_MOMENTS_KEY, OWNED_PACKS_KEY } from './storage-keys'

const ALL_MOMENTS: Moment[] = momentsJson as Moment[]

export type PackTier = 'free' | 'paid'

export type PackZone = 'body' | 'eyes' | 'ritual'

export interface MomentPack {
  id: string
  zone: PackZone
  title: string
  description: string
  momentIds: string[]
  tier: PackTier
}

export const PACK_ZONE_ORDER: PackZone[] = ['body', 'eyes', 'ritual']

export const PACK_ZONE_META: Record<PackZone, { title: string; blurb: string }> = {
  body: {
    title: 'Body',
    blurb: 'Neck, shoulders, back — desk maintenance, not a workout.',
  },
  eyes: {
    title: 'Eyes',
    blurb: 'Screen breaks — look away from the monitor.',
  },
  ritual: {
    title: 'Ritual',
    blurb: 'Small habits at the desk.',
  },
}

/** Desk-maintenance bundles — extend for paid packs later. */
export const MOMENT_PACKS: MomentPack[] = [
  {
    id: 'eyes',
    zone: 'eyes',
    title: 'Look away',
    description: 'Screen break — eyes off the monitor.',
    momentIds: ['fensterblick'],
    tier: 'free',
  },
  {
    id: 'upper',
    zone: 'body',
    title: 'Neck & shoulders',
    description: 'Side tilt and shoulder-blade pull — quick desk relief.',
    momentIds: ['nacken-seite', 'schulterblatt-zug'],
    tier: 'free',
  },
  {
    id: 'back',
    zone: 'body',
    title: 'Back',
    description: 'Pelvis, cat-cow, lumbar press, twist, chest open — desk back, not a workout.',
    momentIds: [
      'thorax-drehen',
      'katzenbuckel-stuhl',
      'lenden-druck',
      'becken-kreis',
      'becken-kipp',
      'tisch-lehnen',
      'brust-oeffnen',
    ],
    tier: 'free',
  },
  {
    id: 'desk',
    zone: 'ritual',
    title: 'Desk ritual',
    description: 'Small habits at the desk — not exercises.',
    momentIds: ['wasser-schluck'],
    tier: 'free',
  },
]

const ALL_PACK_IDS = MOMENT_PACKS.map((p) => p.id)

export function getMomentPack(id: string): MomentPack | undefined {
  return MOMENT_PACKS.find((p) => p.id === id)
}

export function getPackMoments(pack: MomentPack): Moment[] {
  return pack.momentIds
    .map((id) => ALL_MOMENTS.find((m) => m.id === id))
    .filter((m): m is Moment => m != null)
}

export function readOwnedPackIds(): string[] {
  try {
    const raw = localStorage.getItem(OWNED_PACKS_KEY)
    if (!raw) return [...ALL_PACK_IDS]
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return [...ALL_PACK_IDS]
    const ids = parsed.filter((id): id is string => typeof id === 'string')
    return ids.length > 0 ? ids : [...ALL_PACK_IDS]
  } catch {
    return [...ALL_PACK_IDS]
  }
}

export function isPackOwned(packId: string): boolean {
  return readOwnedPackIds().includes(packId)
}

export function ownedPacks(): MomentPack[] {
  const owned = new Set(readOwnedPackIds())
  return MOMENT_PACKS.filter((p) => owned.has(p.id))
}

export interface PackZoneSection {
  zone: PackZone
  title: string
  blurb: string
  packs: MomentPack[]
}

/** Group owned packs by body / eyes / ritual for the library browse view. */
export function packZoneSections(packs = ownedPacks()): PackZoneSection[] {
  return PACK_ZONE_ORDER.map((zone) => {
    const meta = PACK_ZONE_META[zone]
    return {
      zone,
      title: meta.title,
      blurb: meta.blurb,
      packs: packs.filter((p) => p.zone === zone),
    }
  }).filter((section) => section.packs.length > 0)
}

/** Future: unlock after purchase / license key. */
export function unlockPack(packId: string): void {
  const owned = new Set(readOwnedPackIds())
  owned.add(packId)
  try {
    localStorage.setItem(OWNED_PACKS_KEY, JSON.stringify([...owned]))
  } catch {
    // In-memory only this session.
  }
}

function ownedMomentIds(): string[] {
  const ids: string[] = []
  for (const pack of ownedPacks()) {
    for (const id of pack.momentIds) {
      if (!ids.includes(id)) ids.push(id)
    }
  }
  return ids
}

function readSavedLoopIds(): string[] | null {
  try {
    const raw = localStorage.getItem(LOOP_MOMENTS_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return null
    return parsed.filter((id): id is string => typeof id === 'string')
  } catch {
    return null
  }
}

function writeLoopIds(ids: string[]): void {
  try {
    localStorage.setItem(LOOP_MOMENTS_KEY, JSON.stringify(ids))
  } catch {
    // In-memory only this session.
  }
}

/** Ids in the sit/stand loop. Uncustomized → every owned pack moment. */
export function loopMomentIds(): string[] {
  const owned = ownedMomentIds()
  const saved = readSavedLoopIds()
  if (saved == null) return owned
  const ownedSet = new Set(owned)
  return saved.filter((id) => ownedSet.has(id))
}

export function isMomentInLoop(id: string): boolean {
  const owned = new Set(ownedMomentIds())
  if (!owned.has(id)) return false
  const saved = readSavedLoopIds()
  if (saved == null) return true
  return saved.includes(id)
}

export function setMomentInLoop(id: string, on: boolean): void {
  const owned = ownedMomentIds()
  if (!owned.includes(id)) return
  const next = new Set(loopMomentIds())
  if (on) next.add(id)
  else next.delete(id)
  writeLoopIds([...next])
}

export function loopMoments(): Moment[] {
  const enabled = new Set(loopMomentIds())
  return ALL_MOMENTS.filter((m) => enabled.has(m.id))
}

export function hasCustomizedLoop(): boolean {
  return readSavedLoopIds() != null
}

export function loopCountInPack(pack: MomentPack): number {
  return pack.momentIds.filter((id) => isMomentInLoop(id)).length
}

/** Favorites grouped by pack — for the library subpage. */
export function loopMomentsByPack(): { pack: MomentPack; moments: Moment[] }[] {
  const enabled = new Set(loopMomentIds())
  const groups: { pack: MomentPack; moments: Moment[] }[] = []
  for (const pack of packZoneSections().flatMap((section) => section.packs)) {
    const moments = getPackMoments(pack).filter((m) => enabled.has(m.id))
    if (moments.length > 0) groups.push({ pack, moments })
  }
  return groups
}

/** Sit/stand pick pool — checked moments; empty selection falls back to all owned. */
export function rhythmMoments(): Moment[] {
  const picked = loopMoments()
  if (picked.length > 0) return picked
  const ownedIds = new Set(ownedMomentIds())
  const fallback = ALL_MOMENTS.filter((m) => ownedIds.has(m.id))
  return fallback.length > 0 ? fallback : ALL_MOMENTS
}

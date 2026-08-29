import momentsJson from './moments.json'
import type { Moment } from './exercises'
import { OWNED_PACKS_KEY } from './storage-keys'

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
    description: 'Sit twists, cat-cow, lumbar press, chest open — full desk back round.',
    momentIds: ['thorax-drehen', 'katzenbuckel-stuhl', 'lenden-druck', 'brust-oeffnen'],
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

/** Moments eligible for sit/stand pick — owned packs only. */
export function rhythmMoments(): Moment[] {
  const ownedIds = new Set<string>()
  for (const pack of ownedPacks()) {
    for (const id of pack.momentIds) ownedIds.add(id)
  }
  const pool = ALL_MOMENTS.filter((m) => ownedIds.has(m.id))
  return pool.length > 0 ? pool : ALL_MOMENTS
}

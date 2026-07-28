import type { EnergyMode } from './state'

export type MotivationKind = 'high' | 'lazy' | 'north'

export interface Motivation {
  id: string
  kind: MotivationKind
  text: string
}

export const MOTIVATIONS: Motivation[] = [
  {
    id: 'server',
    kind: 'high',
    text: 'Your back is not an unlimited resource. Treat it like infra: prevention beats outage.',
  },
  {
    id: 'oxygen',
    kind: 'high',
    text: 'Standing is not a workout. It is maintenance — before things catch fire.',
  },
  {
    id: 'desk-debt',
    kind: 'high',
    text: 'Every hour in the chair without a switch is tech debt. Compound interest included.',
  },
  {
    id: 'procrastinate-stand',
    kind: 'lazy',
    text: 'Procrastinating while standing still beats procrastinating while sitting. Raise the desk.',
  },
  {
    id: 'almost-nothing',
    kind: 'lazy',
    text: 'You do not need motivation. You only need three minutes you do not cancel.',
  },
  {
    id: 'lazy-win',
    kind: 'lazy',
    text: 'Lazy Mode is not failure. It is survival mode for real days.',
  },
  {
    id: 'papa-fang',
    kind: 'north',
    text: 'You are not training for quitting time — you are investing in the moment someone yells “Dad, catch!”',
  },
  {
    id: 'earlier-fit',
    kind: 'north',
    text: 'You used to be fit. Today one minute is enough. That counts.',
  },
  {
    id: 'battery-empty',
    kind: 'north',
    text: 'After work the battery is empty. That is why this happens between meetings.',
  },
  {
    id: 'long-game',
    kind: 'north',
    text: 'The goal is not a six-pack. The goal is staying in the game for a long time.',
  },
]

/** Mode pool only — Nordstern is reserved for rare ambient at day start. */
export function pickMotivation(
  mode: EnergyMode,
  recentIds: string[],
  _pickCount: number,
): Motivation {
  const pool = MOTIVATIONS.filter((m) => m.kind === mode)
  const fresh = pool.filter((m) => !recentIds.includes(m.id))
  const candidates = fresh.length > 0 ? fresh : pool
  return candidates[Math.floor(Math.random() * candidates.length)]!
}

/** Quiet ambient line for during the countdown — prefers Nordstern. */
export function pickAmbient(recentIds: string[]): Motivation {
  const north = MOTIVATIONS.filter((m) => m.kind === 'north')
  const fresh = north.filter((m) => !recentIds.includes(m.id))
  const candidates = fresh.length > 0 ? fresh : north
  return candidates[Math.floor(Math.random() * candidates.length)]!
}

export function rememberMotivation(recent: string[], id: string, max = 5): string[] {
  return [id, ...recent.filter((x) => x !== id)].slice(0, max)
}

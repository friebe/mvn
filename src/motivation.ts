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
    text: 'Dein Rücken ist keine unbegrenzte Ressource. Behandle ihn wie deine Server-Infrastruktur: Prävention schlägt Systemausfall.',
  },
  {
    id: 'oxygen',
    kind: 'high',
    text: 'Stehen ist kein Workout. Es ist Wartung. Und Wartung macht man, bevor es brennt.',
  },
  {
    id: 'desk-debt',
    kind: 'high',
    text: 'Jede Stunde am Stuhl ohne Wechsel ist technische Schuld. Zinseszins inklusive.',
  },
  {
    id: 'procrastinate-stand',
    kind: 'lazy',
    text: 'Prokrastinieren im Stehen ist immer noch gesünder als Prokrastinieren im Sitzen. Fahr hoch das Ding.',
  },
  {
    id: 'almost-nothing',
    kind: 'lazy',
    text: 'Du musst nicht motiviert sein. Du musst nur drei Minuten nicht absagen.',
  },
  {
    id: 'lazy-win',
    kind: 'lazy',
    text: 'Lazy Mode ist kein Versagen. Es ist der Überlebensmodus für echte Tage.',
  },
  {
    id: 'papa-fang',
    kind: 'north',
    text: 'Du trainierst nicht für den Feierabend — du investierst in den Moment, in dem jemand „Papa, fang!“ ruft.',
  },
  {
    id: 'earlier-fit',
    kind: 'north',
    text: 'Früher warst du fit. Heute reicht eine Minute. Das zählt.',
  },
  {
    id: 'battery-empty',
    kind: 'north',
    text: 'Nach Feierabend ist die Batterie leer. Deshalb passiert das hier — zwischen den Meetings.',
  },
  {
    id: 'long-game',
    kind: 'north',
    text: 'Ziel ist nicht der Sixpack. Ziel ist: noch lange mitspielen können.',
  },
]

/** Every 3rd–4th pick pulls from nordstern; otherwise mode pool. */
export function pickMotivation(
  mode: EnergyMode,
  recentIds: string[],
  pickCount: number,
): Motivation {
  const useNorth = pickCount > 0 && pickCount % 4 === 0
  const kind: MotivationKind = useNorth ? 'north' : mode
  const pool = MOTIVATIONS.filter((m) => m.kind === kind)
  const fresh = pool.filter((m) => !recentIds.includes(m.id))
  const candidates = fresh.length > 0 ? fresh : pool
  return candidates[Math.floor(Math.random() * candidates.length)]!
}

export function rememberMotivation(recent: string[], id: string, max = 5): string[] {
  return [id, ...recent.filter((x) => x !== id)].slice(0, max)
}

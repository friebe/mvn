import type { EnergyMode } from './state'

export interface Exercise {
  id: string
  mode: EnergyMode | 'both'
  title: string
  hint: string
}

export const EXERCISES: Exercise[] = [
  {
    id: 'waden-pump',
    mode: 'high',
    title: 'Waden-Pump',
    hint: 'Abwechselnd Fersen heben — Muskelpumpe für frischen Kopf.',
  },
  {
    id: 'nacken-release',
    mode: 'high',
    title: 'Nacken-Release',
    hint: 'Langsam Ohr zur Schulter, andere Seite. Kein Rucken.',
  },
  {
    id: 'schulterkreisen',
    mode: 'high',
    title: 'Schulterkreisen',
    hint: 'Große Kreise rückwärts, zehn Mal. Hemd bleibt trocken.',
  },
  {
    id: 'mini-hinge',
    mode: 'high',
    title: 'Mini-Hinge',
    hint: 'Hüfte leicht knicken, Rücken lang — fünf langsame Wiederholungen.',
  },
  {
    id: 'faules-strecken',
    mode: 'lazy',
    title: 'Das faule Strecken',
    hint: 'Arme hoch, laut gähnen. Das zählt.',
  },
  {
    id: 'fensterblick',
    mode: 'lazy',
    title: 'Der stumpfe Fensterblick',
    hint: 'Weitsehen bis zum Horizont. Augen-Reset, null Schweiß.',
  },
  {
    id: 'schulter-fallen',
    mode: 'lazy',
    title: 'Schultern fallen lassen',
    hint: 'Einatmen hoch, ausatmen fallen. Dreimal. Fertig.',
  },
  {
    id: 'fusswippen',
    mode: 'lazy',
    title: 'Fußwippen',
    hint: 'Unter dem Tisch wippen. Niemand muss es sehen.',
  },
]

export function pickExercise(
  mode: EnergyMode,
  recentIds: string[],
): Exercise {
  const pool = EXERCISES.filter((e) => e.mode === mode || e.mode === 'both')
  const fresh = pool.filter((e) => !recentIds.includes(e.id))
  const candidates = fresh.length > 0 ? fresh : pool
  return candidates[Math.floor(Math.random() * candidates.length)]!
}

export function rememberId(recent: string[], id: string, max = 4): string[] {
  return [id, ...recent.filter((x) => x !== id)].slice(0, max)
}

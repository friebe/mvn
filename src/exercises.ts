import type { EnergyMode } from './state'

export type MomentKind = 'body' | 'eyes' | 'breath' | 'desk' | 'play'

export interface Moment {
  id: string
  mode: EnergyMode | 'both'
  kind: MomentKind
  title: string
  prompt: string
}

/** Micro-moments (~15s) — not workouts. */
export const MOMENTS: Moment[] = [
  {
    id: 'waden-pump',
    mode: 'high',
    kind: 'body',
    title: 'Waden-Pump',
    prompt: 'Fersen hoch, runter — zehn Mal. Fertig.',
  },
  {
    id: 'nacken-release',
    mode: 'high',
    kind: 'body',
    title: 'Nacken-Release',
    prompt: 'Ohr zur Schulter, andere Seite. Kein Rucken.',
  },
  {
    id: 'schulterkreisen',
    mode: 'high',
    kind: 'body',
    title: 'Schulterkreisen',
    prompt: 'Große Kreise rückwärts. Hemd bleibt trocken.',
  },
  {
    id: 'mini-hinge',
    mode: 'high',
    kind: 'body',
    title: 'Mini-Hinge',
    prompt: 'Hüfte leicht knicken, Rücken lang — fünf Mal.',
  },
  {
    id: 'faules-strecken',
    mode: 'lazy',
    kind: 'body',
    title: 'Faules Strecken',
    prompt: 'Arme hoch, laut gähnen. Das zählt.',
  },
  {
    id: 'schulter-fallen',
    mode: 'lazy',
    kind: 'breath',
    title: 'Schultern fallen',
    prompt: 'Einatmen hoch, ausatmen fallen. Dreimal.',
  },
  {
    id: 'fusswippen',
    mode: 'lazy',
    kind: 'body',
    title: 'Fußwippen',
    prompt: 'Unter dem Tisch wippen. Niemand muss es sehen.',
  },
  {
    id: 'fensterblick',
    mode: 'both',
    kind: 'eyes',
    title: 'Fensterblick',
    prompt: 'Weitsehen bis zum Horizont. Augen-Reset.',
  },
  {
    id: 'fern-name',
    mode: 'both',
    kind: 'eyes',
    title: 'Was siehst du?',
    prompt: 'Ein Ding am Fenster benennen. Nur das.',
  },
  {
    id: 'blink-reset',
    mode: 'both',
    kind: 'eyes',
    title: 'Blink-Reset',
    prompt: 'Zehn bewusste Blinzler. Bildschirm wartet.',
  },
  {
    id: 'wasser-schluck',
    mode: 'both',
    kind: 'desk',
    title: 'Wasserschluck',
    prompt: 'Einen Schluck. Tisch darf warten.',
  },
  {
    id: 'stuhl-weg',
    mode: 'both',
    kind: 'desk',
    title: 'Stuhl-Schub',
    prompt: 'Stuhl einen Handbreit weg. Platz für Beine.',
  },
  {
    id: 'tischkante',
    mode: 'both',
    kind: 'desk',
    title: 'Tischkante',
    prompt: 'Hände an die Kante, leicht abstützen, tief atmen.',
  },
  {
    id: 'fenster-name-play',
    mode: 'both',
    kind: 'play',
    title: 'Wolken-Spot',
    prompt: 'Eine Form am Himmel finden. Oder erfinden.',
  },
  {
    id: 'laut-gähnen',
    mode: 'lazy',
    kind: 'play',
    title: 'Laut gähnen',
    prompt: 'Absichtlich. Lächerlich. Wirkt trotzdem.',
  },
  {
    id: 'zeigefinger-stretch',
    mode: 'both',
    kind: 'play',
    title: 'Finger-Welle',
    prompt: 'Zehn Finger einzeln strecken. Klingt albern. Ist ok.',
  },
]

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

/** Three cards: prefer body / eyes / play-or-desk diversity. */
export function pickMomentCards(mode: EnergyMode, recentIds: string[]): Moment[] {
  const preferred: MomentKind[] = ['body', 'eyes', Math.random() > 0.5 ? 'play' : 'desk']
  const picked: Moment[] = []
  const used = new Set<string>()

  for (const kind of preferred) {
    const m = pickMoment(mode, [...recentIds, ...used], kind)
    if (!used.has(m.id)) {
      picked.push(m)
      used.add(m.id)
    }
  }

  while (picked.length < 3) {
    const m = pickMoment(mode, [...recentIds, ...used])
    if (used.has(m.id)) {
      const fallback = poolFor(mode).find((x) => !used.has(x.id)) ?? MOMENTS.find((x) => !used.has(x.id))
      if (!fallback) break
      picked.push(fallback)
      used.add(fallback.id)
    } else {
      picked.push(m)
      used.add(m.id)
    }
  }

  return picked.slice(0, 3)
}

export function rememberId(recent: string[], id: string, max = 6): string[] {
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

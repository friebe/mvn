export type MotivationKind = 'high' | 'lazy' | 'north'
export type MotivationWhen = 'morning' | 'afternoon' | 'evening' | 'any'

export interface Motivation {
  id: string
  kind: MotivationKind
  text: string
  when?: MotivationWhen
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
    id: 'posture-stack',
    kind: 'high',
    text: 'Slouching stacks quietly. One switch breaks the chain.',
  },
  {
    id: 'meeting-marathon',
    kind: 'high',
    text: 'Back-to-back calls are not a reason to skip — they are the reason to keep it tiny.',
  },
  {
    id: 'infra-uptime',
    kind: 'high',
    text: 'You would not run a server at 100% CPU all day. Same rule for your spine.',
  },
  {
    id: 'micro-lift',
    kind: 'high',
    text: 'Fifteen seconds of movement beats an hour of good intentions.',
    when: 'afternoon',
  },
  {
    id: 'afternoon-slump',
    kind: 'high',
    text: 'The 3 pm slump is real. Standing is a reset, not a workout.',
    when: 'afternoon',
  },
  {
    id: 'morning-start',
    kind: 'high',
    text: 'First block of the day sets the tone. Low bar, still counts.',
    when: 'morning',
  },
  {
    id: 'friday-easy',
    kind: 'high',
    text: 'Friday does not need heroics. Show up, switch once, done.',
    when: 'any',
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
    text: 'Soft days still count. The desk only needs one honest switch.',
  },
  {
    id: 'bare-minimum',
    kind: 'lazy',
    text: 'The bare minimum still moves the needle. Especially on tired days.',
  },
  {
    id: 'no-hero',
    kind: 'lazy',
    text: 'No hero mode required. Desk up, breathe, sit back down — still a round.',
  },
  {
    id: 'tired-ok',
    kind: 'lazy',
    text: 'Tired is not lazy. Three minutes standing is enough today.',
    when: 'evening',
  },
  {
    id: 'monday-soft',
    kind: 'lazy',
    text: 'Monday mercy: one switch beats zero switches.',
    when: 'morning',
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
  {
    id: 'kids-floor',
    kind: 'north',
    text: 'Getting down on the floor with kids starts with hips that still bend.',
  },
  {
    id: 'ten-years',
    kind: 'north',
    text: 'In ten years you will not remember this meeting. You will remember whether your body still works.',
  },
  {
    id: 'small-votes',
    kind: 'north',
    text: 'Every stand is a vote for future you. They add up quietly.',
  },
  {
    id: 'weekend-energy',
    kind: 'north',
    text: 'Weekend energy is paid for on weekdays — in small deposits, not one big workout.',
  },
  {
    id: 'milestone-three',
    kind: 'north',
    text: 'Three confirmed stands today. That is not nothing — that is a rhythm.',
  },
  {
    id: 'friday-north',
    kind: 'north',
    text: 'Friday still counts. Future you does not take weekends off from needing a spine.',
  },
]

function timeOfDay(at: Date): MotivationWhen {
  const h = at.getHours()
  if (h >= 5 && h < 11) return 'morning'
  if (h >= 11 && h < 17) return 'afternoon'
  if (h >= 17 && h < 22) return 'evening'
  return 'any'
}

function poolForKind(kind: MotivationKind, at: Date): Motivation[] {
  const slot = timeOfDay(at)
  const base = MOTIVATIONS.filter((m) => m.kind === kind)
  const matched = base.filter((m) => !m.when || m.when === slot || m.when === 'any')
  return matched.length >= 2 ? matched : base
}

/** Ritual lines — former High + Lazy pools, no mode split. */
function poolForCue(at: Date): Motivation[] {
  const slot = timeOfDay(at)
  const base = MOTIVATIONS.filter((m) => m.kind === 'high' || m.kind === 'lazy')
  const matched = base.filter((m) => !m.when || m.when === slot || m.when === 'any')
  return matched.length >= 2 ? matched : base
}

function pickFromPool(pool: Motivation[], recentIds: string[]): Motivation {
  const fresh = pool.filter((m) => !recentIds.includes(m.id))
  const candidates = fresh.length > 0 ? fresh : pool
  return candidates[Math.floor(Math.random() * candidates.length)]!
}

/** Cue pool only — Nordstern is reserved for rare ambient lines. */
export function pickMotivation(
  recentIds: string[],
  _pickCount: number,
  at = new Date(),
): Motivation {
  return pickFromPool(poolForCue(at), recentIds)
}

/** Rare ambient — Nordstern lines during sit/stand countdown. */
export function pickAmbient(recentIds: string[], at = new Date()): Motivation {
  const pool = poolForKind('north', at)
  const fresh = pool.filter((m) => !recentIds.includes(m.id))
  const candidates = fresh.length > 0 ? fresh : pool
  return candidates[Math.floor(Math.random() * candidates.length)]!
}

/** After 3+ confirmed stands, on Friday first sit, or ~15% first sit of day. */
export function shouldShowRareAmbient(
  confirmedToday: number,
  ambientMilestone: number,
  northShownKey: string | null,
  at = new Date(),
): boolean {
  const day = `${at.getFullYear()}-${String(at.getMonth() + 1).padStart(2, '0')}-${String(at.getDate()).padStart(2, '0')}`
  const firstSitToday = northShownKey !== day
  const isFriday = at.getDay() === 5
  const crossedMilestone = confirmedToday >= 3 && confirmedToday > ambientMilestone

  if (isFriday && firstSitToday) return true
  if (crossedMilestone) return true
  if (firstSitToday && Math.random() < 0.15) return true
  return false
}

export function ambientMilestoneAfterShow(confirmedToday: number): number {
  return confirmedToday >= 3 ? confirmedToday : 0
}

export function rememberMotivation(recent: string[], id: string, max = 8): string[] {
  return [id, ...recent.filter((x) => x !== id)].slice(0, max)
}

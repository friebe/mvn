/** Local usage analytics — LocalStorage only, no network. */

export type StatEvent =
  | 'day_start'
  | 'day_close'
  | 'sit_done'
  | 'stand_done'
  | 'reset_done'
  | 'rise'
  | 'desk_confirmed'
  | 'lazy_choice'
  | 'freeze_choice'
  | 'freeze_manual'
  | 'ritual_done'
  | 'ritual_skip'

export interface DayBucket {
  date: string
  day_start: number
  day_close: number
  sit_done: number
  stand_done: number
  reset_done: number
  rise: number
  desk_confirmed: number
  lazy_choice: number
  freeze_choice: number
  freeze_manual: number
  ritual_done: number
  ritual_skip: number
}

export interface StatsStore {
  version: 1
  days: Record<string, DayBucket>
}

export interface StatsSummary {
  day_start: number
  day_close: number
  sit_done: number
  stand_done: number
  reset_done: number
  rise: number
  desk_confirmed: number
  lazy_choice: number
  freeze_choice: number
  freeze_manual: number
  ritual_done: number
  ritual_skip: number
  /** Freeze gesamt (Schwelle + manuell) */
  freeze_total: number
  /** Echte Wechsel = Tisch bestätigt */
  rounds: number
}

const STORAGE_KEY = 'mvn.stats.v1'

function emptyDay(date: string): DayBucket {
  return {
    date,
    day_start: 0,
    day_close: 0,
    sit_done: 0,
    stand_done: 0,
    reset_done: 0,
    rise: 0,
    desk_confirmed: 0,
    lazy_choice: 0,
    freeze_choice: 0,
    freeze_manual: 0,
    ritual_done: 0,
    ritual_skip: 0,
  }
}

export function todayKey(d = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function loadStats(): StatsStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { version: 1, days: {} }
    const parsed = JSON.parse(raw) as StatsStore
    if (parsed?.version !== 1 || typeof parsed.days !== 'object') {
      return { version: 1, days: {} }
    }
    return parsed
  } catch {
    return { version: 1, days: {} }
  }
}

function saveStats(store: StatsStore): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
}

export function recordStat(event: StatEvent, at = new Date()): void {
  const store = loadStats()
  const key = todayKey(at)
  const day = { ...emptyDay(key), ...(store.days[key] ?? {}) }
  day[event] = (day[event] ?? 0) + 1
  store.days[key] = day
  saveStats(store)
}

function sumBucket(bucket: DayBucket | undefined): StatsSummary {
  const b = { ...emptyDay(''), ...bucket }
  return {
    day_start: b.day_start,
    day_close: b.day_close,
    sit_done: b.sit_done,
    stand_done: b.stand_done,
    reset_done: b.reset_done,
    rise: b.rise,
    desk_confirmed: b.desk_confirmed,
    lazy_choice: b.lazy_choice,
    freeze_choice: b.freeze_choice,
    freeze_manual: b.freeze_manual,
    ritual_done: b.ritual_done,
    ritual_skip: b.ritual_skip,
    freeze_total: b.freeze_choice + b.freeze_manual,
    rounds: b.desk_confirmed,
  }
}

function addSummaries(a: StatsSummary, b: StatsSummary): StatsSummary {
  return {
    day_start: a.day_start + b.day_start,
    day_close: a.day_close + b.day_close,
    sit_done: a.sit_done + b.sit_done,
    stand_done: a.stand_done + b.stand_done,
    reset_done: a.reset_done + b.reset_done,
    rise: a.rise + b.rise,
    desk_confirmed: a.desk_confirmed + b.desk_confirmed,
    lazy_choice: a.lazy_choice + b.lazy_choice,
    freeze_choice: a.freeze_choice + b.freeze_choice,
    freeze_manual: a.freeze_manual + b.freeze_manual,
    ritual_done: a.ritual_done + b.ritual_done,
    ritual_skip: a.ritual_skip + b.ritual_skip,
    freeze_total: a.freeze_total + b.freeze_total,
    rounds: a.rounds + b.rounds,
  }
}

export function summarizeRange(fromKey: string, toKey: string): StatsSummary {
  const store = loadStats()
  let acc = sumBucket(undefined)
  for (const [key, day] of Object.entries(store.days)) {
    if (key >= fromKey && key <= toKey) {
      acc = addSummaries(acc, sumBucket(day))
    }
  }
  return acc
}

export function summarizeToday(): StatsSummary {
  const key = todayKey()
  return sumBucket(loadStats().days[key])
}

export function summarizeLastDays(n: number): StatsSummary {
  const end = new Date()
  const start = new Date()
  start.setDate(end.getDate() - (n - 1))
  return summarizeRange(todayKey(start), todayKey(end))
}

export function summarizeAll(): StatsSummary {
  const store = loadStats()
  let acc = sumBucket(undefined)
  for (const day of Object.values(store.days)) {
    acc = addSummaries(acc, sumBucket(day))
  }
  return acc
}

/** Last n calendar days, oldest → newest, for sparkline. */
export function lastDayBuckets(n: number): DayBucket[] {
  const store = loadStats()
  const out: DayBucket[] = []
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const key = todayKey(d)
    out.push({ ...emptyDay(key), ...(store.days[key] ?? {}) })
  }
  return out
}

export function buildDayCloseLine(s: StatsSummary): string {
  const parts: string[] = []
  if (s.desk_confirmed > 0) {
    parts.push(`${s.desk_confirmed}× hochgefahren`)
  } else if (s.rise > 0) {
    parts.push(`${s.rise}× Tisch hoch ohne Beweis`)
  } else if (s.sit_done > 0) {
    parts.push(`${s.sit_done} Sitzblöcke beendet`)
  } else {
    parts.push('Heute kaum Bewegung')
  }
  if (s.ritual_done > 0) parts.push(`${s.ritual_done}× Moment`)
  if (s.ritual_skip > 0) parts.push(`${s.ritual_skip}× nur Stehen`)
  if (s.lazy_choice > 0) parts.push(`Lazy ${s.lazy_choice}×`)
  if (s.freeze_total > 0) parts.push(`${s.freeze_total}× Freeze wegen Call`)
  return `${parts.join(', ')}. Der Tisch hat mitgehalten — das zählt fürs Mitspielen.`
}

/** Short narrative for analytics hero. */
export function buildDayStory(s: StatsSummary): string {
  if (s.day_start === 0 && s.rounds === 0 && s.sit_done === 0) {
    return 'Noch kein Tag gestartet. Der Tisch wartet.'
  }
  const bits: string[] = []
  if (s.rounds > 0) bits.push(`${s.rounds} echte Hochfahrt${s.rounds === 1 ? '' : 'en'}`)
  else if (s.rise > 0) bits.push(`${s.rise}× angesetzt`)
  if (s.freeze_total > 0) bits.push(`${s.freeze_total}× Freeze`)
  if (s.lazy_choice > 0) bits.push('Lazy unterwegs')
  if (s.ritual_done > 0 && s.ritual_skip === 0) bits.push('Momente mitgemacht')
  else if (s.ritual_skip > s.ritual_done) bits.push('öfter nur gestanden')
  if (bits.length === 0) return 'Der Tag läuft. Noch keine Wechsel — ok.'
  return bits.join(' · ') + '.'
}

export function clearStats(): void {
  localStorage.removeItem(STORAGE_KEY)
}

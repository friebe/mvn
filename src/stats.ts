/** Local usage analytics — LocalStorage only, no network. */

import { STATS_KEY } from './storage-keys'

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
  /** Echte Wechsel = mid-phase check-in Yes (sit or stand) */
  rounds: number
}

/** Desk raised without a matching check-in Yes (rough gap signal). */
export function unconfirmedRises(s: StatsSummary): number {
  return Math.max(0, s.rise - s.rounds)
}

/** Tage mit irgendwelcher Nutzung im Store (für 7d / Gesamt). */
export function activeDayCount(n?: number): number {
  const store = loadStats()
  const keys = Object.keys(store.days).filter((key) => {
    const d = store.days[key]
    if (!d) return false
    return (
      d.day_start > 0 ||
      d.rise > 0 ||
      d.desk_confirmed > 0 ||
      d.sit_done > 0 ||
      d.stand_done > 0 ||
      d.ritual_done > 0 ||
      d.ritual_skip > 0 ||
      d.freeze_choice > 0 ||
      d.freeze_manual > 0
    )
  })
  if (n == null) return keys.length
  const end = todayKey()
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - (n - 1))
  const start = todayKey(startDate)
  return keys.filter((k) => k >= start && k <= end).length
}

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
    const raw = localStorage.getItem(STATS_KEY)
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
  localStorage.setItem(STATS_KEY, JSON.stringify(store))
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

/** Compare today with the same weekday 1–4 weeks ago. */
export function buildDayCloseComparison(at = new Date()): string | null {
  const today = summarizeToday()
  if (today.rounds === 0 && today.rise === 0 && today.ritual_done === 0) return null

  const store = loadStats()
  const todayKeyStr = todayKey(at)

  for (let weeks = 1; weeks <= 4; weeks++) {
    const d = new Date(at)
    d.setDate(d.getDate() - 7 * weeks)
    const key = todayKey(d)
    if (key >= todayKeyStr) continue

    const bucket = store.days[key]
    if (!bucket) continue

    const prev = sumBucket(bucket)
    if (prev.rounds === 0 && prev.rise === 0 && prev.ritual_done === 0) continue

    const weekday = d.toLocaleDateString('en-US', { weekday: 'long' })

    if (today.rounds > 0 || prev.rounds > 0) {
      if (today.rounds > prev.rounds) {
        return `Today ${today.rounds}× confirmed — last ${weekday}: ${prev.rounds}×.`
      }
      if (today.rounds < prev.rounds) {
        return `Today ${today.rounds}× confirmed — last ${weekday} was ${prev.rounds}×. Still counts.`
      }
      return `Same rhythm as last ${weekday}: ${today.rounds}× confirmed.`
    }

    if (today.ritual_done > prev.ritual_done) {
      return `More moments than last ${weekday} (${today.ritual_done} vs ${prev.ritual_done}).`
    }
  }

  return null
}

export function buildDayCloseLine(s: StatsSummary): string {
  const parts: string[] = []
  if (s.desk_confirmed > 0) {
    parts.push(`${s.desk_confirmed}× check-in confirmed`)
  } else if (s.rise > 0) {
    parts.push(`${s.rise}× desk up`)
  } else if (s.sit_done > 0) {
    parts.push(`${s.sit_done} sitting blocks finished`)
  } else {
    parts.push('Hardly any movement today')
  }
  if (s.ritual_done > 0) parts.push(`${s.ritual_done}× moment`)
  if (s.ritual_skip > 0) parts.push(`${s.ritual_skip}× skipped`)
  if (s.lazy_choice > 0) parts.push(`Lazy ${s.lazy_choice}×`)
  if (s.freeze_total > 0) parts.push(`${s.freeze_total}× freeze for calls`)
  return `${parts.join(', ')}. The desk kept up — that counts for showing up.`
}

/** Short narrative for analytics — no number dump (hero grid has the counts). */
export function buildDayStory(s: StatsSummary): string {
  if (s.day_start === 0 && s.rounds === 0 && s.sit_done === 0) {
    return 'No day started yet. The desk is waiting.'
  }
  if (s.ritual_skip > 0 && s.ritual_skip >= s.ritual_done) {
    return 'Often continued straight on — without a short moment in between.'
  }
  if (s.rounds > 0 && s.ritual_done > s.ritual_skip) {
    return 'Check-ins confirmed and moments taken.'
  }
  if (s.rounds > 0) return 'Check-ins confirmed — you answered when the desk asked.'
  if (s.rise > 0) return 'Desk raised — mid-phase check-in often without a tap.'
  if (s.freeze_total > 0) return 'Calls interrupted the flow — freeze protected you.'
  if (s.lazy_choice > 0) return 'Lazy Mode was in play.'
  return 'The day is running. No switches yet — ok.'
}

export function clearStats(): void {
  localStorage.removeItem(STATS_KEY)
}

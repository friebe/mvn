import { thisWeekBuckets, todayKey, type DayBucket } from './stats'

/** Finished stand blocks — the metric worth seeing, not sit phases. */
export function standingBlocks(day: DayBucket): number {
  return day.stand_done
}

export function weekdayShort(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number)
  const dt = new Date(y!, m! - 1, d!)
  return dt.toLocaleDateString('en-US', { weekday: 'short' })
}

/** Shared week sparkline. Empty days stay stubs — no streak, no shame. */
export function weekBarsHtml(maxHeight = 120): string {
  const spark = thisWeekBuckets()
  const today = todayKey()
  const max = Math.max(1, ...spark.map(standingBlocks))
  const aria = spark.map((d) => `${weekdayShort(d.date)} ${standingBlocks(d)}`).join(', ')

  const cols = spark
    .map((d) => {
      const value = standingBlocks(d)
      const empty = value <= 0
      const h = empty ? 4 : Math.max(10, Math.round((value / max) * maxHeight))
      const todayClass = d.date === today ? ' is-today' : ''
      const futureClass = d.date > today ? ' is-future' : ''
      const emptyClass = empty ? ' is-empty' : ''
      return `<div class="bar-col${todayClass}${futureClass}${emptyClass}">
        <div class="bar" style="height:${h}px" title="${value}"></div>
        <span class="bar-label">${weekdayShort(d.date)}</span>
      </div>`
    })
    .join('')

  return `<div class="week-bars" role="img" aria-label="Standing blocks this week: ${aria}">${cols}</div>`
}

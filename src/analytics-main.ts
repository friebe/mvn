import '@fontsource/fraunces/600.css'
import '@fontsource/source-sans-3/400.css'
import '@fontsource/source-sans-3/600.css'
import './analytics.css'

import { brandLockupHtml, BRAND_TAG } from './brand-mark'
import {
  activeDayCount,
  buildDayStory,
  clearStats,
  lastDayBuckets,
  summarizeAll,
  summarizeLastDays,
  summarizeToday,
  type StatsSummary,
} from './stats'
import { appPath } from './paths'
import { loadState } from './state'
import { applyThemeFromState, bindSystemThemeListener } from './theme'

applyThemeFromState(loadState())
bindSystemThemeListener(() => loadState().theme)

type Period = 'today' | '7d' | 'all'

function summaryFor(period: Period): StatsSummary {
  if (period === 'today') return summarizeToday()
  if (period === '7d') return summarizeLastDays(7)
  return summarizeAll()
}

function weekdayShort(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number)
  const dt = new Date(y!, m! - 1, d!)
  return dt.toLocaleDateString('en-US', { weekday: 'short' })
}

function isEmpty(s: StatsSummary): boolean {
  return (
    s.rounds === 0 &&
    s.rise === 0 &&
    s.freeze_total === 0 &&
    s.day_start === 0 &&
    s.ritual_done === 0 &&
    s.ritual_skip === 0
  )
}

function render(period: Period): void {
  const root = document.querySelector<HTMLElement>('#app')!
  const s = summaryFor(period)
  const spark = lastDayBuckets(7)
  const maxRounds = Math.max(1, ...spark.map((d) => d.sit_done))
  const empty = isEmpty(s)
  const activeDays =
    period === 'today' ? null : period === '7d' ? activeDayCount(7) : activeDayCount()

  root.innerHTML = `
    <div class="analytics">
      <header class="analytics-top">
        <a class="icon-link back-link" href="${appPath()}" aria-label="Back to app" title="Back">
          <svg class="icon" viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false">
            <path fill="currentColor" d="M15.41 7.41 14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
          </svg>
        </a>
        <div class="analytics-heading">
          ${brandLockupHtml(BRAND_TAG, 28)}
        </div>
        <nav class="analytics-nav" aria-label="Actions">
          <button type="button" class="icon-link" id="btn-refresh" aria-label="Refresh" title="Refresh">
            <svg class="icon" viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false">
              <path
                fill="currentColor"
                d="M17.65 6.35A7.95 7.95 0 0 0 12 4a8 8 0 1 0 8 8h-2a6 6 0 1 1-1.76-4.24L14 10h6V4l-2.35 2.35Z"
              />
            </svg>
          </button>
          <button type="button" class="icon-link" id="btn-clear" aria-label="Clear stats" title="Clear stats">
            <svg class="icon" viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false">
              <path
                fill="currentColor"
                d="M6 19a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7H6v12ZM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4Z"
              />
            </svg>
          </button>
          <a
            class="icon-link"
            href="${appPath('settings.html')}"
            aria-label="Settings"
            title="Settings"
          >
            <svg class="icon" viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false">
              <path
                fill="currentColor"
                d="M19.14 12.94c.04-.31.06-.63.06-.94s-.02-.63-.06-.94l2.03-1.58a.5.5 0 0 0 .12-.64l-1.92-3.32a.5.5 0 0 0-.6-.22l-2.39.96a7.03 7.03 0 0 0-1.63-.94l-.36-2.54A.5.5 0 0 0 14.3 2h-4.6a.5.5 0 0 0-.49.42l-.36 2.54c-.58.23-1.12.54-1.63.94l-2.39-.96a.5.5 0 0 0-.6.22L2.31 8.48a.5.5 0 0 0 .12.64L4.46 10.7c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58a.5.5 0 0 0-.12.64l1.92 3.32c.14.24.43.34.68.22l2.39-.96c.5.4 1.05.72 1.63.94l.36 2.54c.05.24.25.42.49.42h4.6c.24 0 .44-.18.49-.42l.36-2.54c.58-.22 1.12-.54 1.63-.94l2.39.96c.25.12.54.02.68-.22l1.92-3.32a.5.5 0 0 0-.12-.64l-2.03-1.58ZM12 15.5A3.5 3.5 0 1 1 12 8.5a3.5 3.5 0 0 1 0 7Z"
              />
            </svg>
          </a>
        </nav>
      </header>

      <div class="period-tabs" role="tablist" aria-label="Period">
        <button type="button" role="tab" data-period="today" class="${period === 'today' ? 'is-on' : ''}" aria-selected="${period === 'today'}">Today</button>
        <button type="button" role="tab" data-period="7d" class="${period === '7d' ? 'is-on' : ''}" aria-selected="${period === '7d'}">7 days</button>
        <button type="button" role="tab" data-period="all" class="${period === 'all' ? 'is-on' : ''}" aria-selected="${period === 'all'}">All time</button>
      </div>

      ${
        empty
          ? `<p class="empty">No use in this period yet. Start a session — a day story will show up here.</p>`
          : `<p class="day-story">${buildDayStory(s)}</p>`
      }

      <section class="hero-grid" aria-label="Core stats">
        <div class="stat" data-tone="sit">
          <p class="stat-value">${s.rise}</p>
          <p class="stat-label">Desk up</p>
        </div>
        <div class="stat" data-tone="stand">
          <p class="stat-value">${s.rounds}</p>
          <p class="stat-label">Confirmed</p>
        </div>
        <div class="stat" data-tone="gap">
          <p class="stat-value">${s.ritual_done}</p>
          <p class="stat-label">Moments</p>
        </div>
        <div class="stat" data-tone="gap">
          <p class="stat-value">${s.ritual_skip}</p>
          <p class="stat-label">Skipped</p>
        </div>
      </section>
      <p class="section-note">Confirmed = Yes on a mid-phase check-in. Moments = tapped a card at desk switch.</p>

      ${
        s.freeze_total > 0
          ? `<section class="hero-grid hero-grid-secondary" aria-label="Freeze">
        <div class="stat" data-tone="freeze">
          <p class="stat-value">${s.freeze_total}</p>
          <p class="stat-label">Freeze</p>
        </div>
      </section>`
          : ''
      }

      <section>
        <h2 class="section-title">Last 7 days</h2>
        <p class="section-note">Bars = finished sit phases per day.</p>
        <div class="bars" aria-hidden="${empty ? 'true' : 'false'}">
          ${spark
            .map((d) => {
              const h = Math.max(4, Math.round((d.sit_done / maxRounds) * 120))
              return `<div class="bar-col">
                <div class="bar" style="height:${h}px" title="${d.sit_done}"></div>
                <span class="bar-label">${weekdayShort(d.date)}</span>
              </div>`
            })
            .join('')}
        </div>
      </section>

      ${
        s.day_start > 0 ||
        s.day_close > 0 ||
        s.lazy_choice > 0 ||
        s.ritual_done > 0 ||
        (activeDays != null && activeDays > 0)
          ? `<section aria-label="More stats">
        <h2 class="section-title">More</h2>
        ${activeDays != null && activeDays > 0 ? `<div class="detail-row"><span>Active days</span><span>${activeDays}</span></div>` : ''}
        ${s.day_start > 0 ? `<div class="detail-row"><span>Days started</span><span>${s.day_start}</span></div>` : ''}
        ${s.day_close > 0 ? `<div class="detail-row"><span>Day close</span><span>${s.day_close}</span></div>` : ''}
        ${s.ritual_done > 0 ? `<div class="detail-row"><span>Moments</span><span>${s.ritual_done}</span></div>` : ''}
        ${s.ritual_skip > 0 ? `<div class="detail-row"><span>Skipped</span><span>${s.ritual_skip}</span></div>` : ''}
        ${s.lazy_choice > 0 ? `<div class="detail-row"><span>Lazy (legacy)</span><span>${s.lazy_choice}</span></div>` : ''}
      </section>`
          : ''
      }
    </div>
  `

  root.querySelectorAll<HTMLButtonElement>('[data-period]').forEach((btn) => {
    btn.addEventListener('click', () => {
      render(btn.dataset.period as Period)
    })
  })

  root.querySelector('#btn-refresh')?.addEventListener('click', () => render(period))
  root.querySelector('#btn-clear')?.addEventListener('click', () => {
    if (confirm('Clear all local analytics?')) {
      clearStats()
      render(period)
    }
  })
}

render('today')

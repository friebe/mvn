import '@fontsource/fraunces/600.css'
import '@fontsource/source-sans-3/400.css'
import '@fontsource/source-sans-3/600.css'
import './analytics.css'

import {
  buildDayStory,
  clearStats,
  lastDayBuckets,
  summarizeAll,
  summarizeLastDays,
  summarizeToday,
  type StatsSummary,
} from './stats'
import { appPath } from './paths'

type Period = 'today' | '7d' | 'all'

function summaryFor(period: Period): StatsSummary {
  if (period === 'today') return summarizeToday()
  if (period === '7d') return summarizeLastDays(7)
  return summarizeAll()
}

function weekdayShort(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number)
  const dt = new Date(y!, m! - 1, d!)
  return dt.toLocaleDateString('de-DE', { weekday: 'short' })
}

function render(period: Period): void {
  const root = document.querySelector<HTMLElement>('#app')!
  const s = summaryFor(period)
  const spark = lastDayBuckets(7)
  const maxRounds = Math.max(1, ...spark.map((d) => d.sit_done))
  const empty = s.rounds === 0 && s.rise === 0 && s.freeze_total === 0 && s.day_start === 0

  root.innerHTML = `
    <div class="analytics">
      <header class="analytics-top">
        <a class="back-link" href="${appPath()}" aria-label="Zurück zur App" title="Zurück">
          <svg class="back-icon" viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false">
            <path
              fill="currentColor"
              d="M15.41 7.41 14 6l-6 6 6 6 1.41-1.41L10.83 12z"
            />
          </svg>
        </a>
        <div class="analytics-heading">
          <p class="analytics-brand">MVN</p>
          <p class="analytics-tag">Analytics · nur lokal auf diesem Gerät</p>
        </div>
        <nav class="analytics-nav">
          <a
            class="settings-link"
            href="${appPath('settings.html')}"
            aria-label="Einstellungen"
            title="Einstellungen"
          >
            <svg class="settings-icon" viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false">
              <path
                fill="currentColor"
                d="M19.14 12.94c.04-.31.06-.63.06-.94s-.02-.63-.06-.94l2.03-1.58a.5.5 0 0 0 .12-.64l-1.92-3.32a.5.5 0 0 0-.6-.22l-2.39.96a7.03 7.03 0 0 0-1.63-.94l-.36-2.54A.5.5 0 0 0 14.3 2h-4.6a.5.5 0 0 0-.49.42l-.36 2.54c-.58.23-1.12.54-1.63.94l-2.39-.96a.5.5 0 0 0-.6.22L2.31 8.48a.5.5 0 0 0 .12.64L4.46 10.7c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58a.5.5 0 0 0-.12.64l1.92 3.32c.14.24.43.34.68.22l2.39-.96c.5.4 1.05.72 1.63.94l.36 2.54c.05.24.25.42.49.42h4.6c.24 0 .44-.18.49-.42l.36-2.54c.58-.22 1.12-.54 1.63-.94l2.39.96c.25.12.54.02.68-.22l1.92-3.32a.5.5 0 0 0-.12-.64l-2.03-1.58ZM12 15.5A3.5 3.5 0 1 1 12 8.5a3.5 3.5 0 0 1 0 7Z"
              />
            </svg>
          </a>
          <button type="button" id="btn-refresh">Aktualisieren</button>
          <button type="button" id="btn-clear">Reset Stats</button>
        </nav>
      </header>

      <div class="period-tabs" role="tablist">
        <button type="button" data-period="today" class="${period === 'today' ? 'is-on' : ''}">Heute</button>
        <button type="button" data-period="7d" class="${period === '7d' ? 'is-on' : ''}">7 Tage</button>
        <button type="button" data-period="all" class="${period === 'all' ? 'is-on' : ''}">Gesamt</button>
      </div>

      ${
        empty
          ? `<p class="empty">Noch keine Nutzung in diesem Zeitraum. Starte eine Session — hier wird daraus eine Tagesgeschichte.</p>`
          : `<p class="day-story">${buildDayStory(s)}</p>`
      }

      <section class="hero-grid" aria-label="Kernzahlen">
        <div class="stat" data-tone="stand">
          <p class="stat-value">${s.rounds}</p>
          <p class="stat-label">Bestätigte Hochfahrten</p>
        </div>
        <div class="stat" data-tone="sit">
          <p class="stat-value">${s.rise}</p>
          <p class="stat-label">Hochfahren</p>
        </div>
        <div class="stat">
          <p class="stat-value">${s.lazy_choice}</p>
          <p class="stat-label">Lazy</p>
        </div>
        <div class="stat" data-tone="freeze">
          <p class="stat-value">${s.freeze_total}</p>
          <p class="stat-label">Freeze</p>
        </div>
      </section>

      <section>
        <h2 class="section-title">Letzte 7 Tage</h2>
        <p class="section-note">Balken = abgeschlossene Sitzphasen (Runden) pro Tag.</p>
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

      <section>
        <h2 class="section-title">Details</h2>
        <div class="detail-row"><span>Tagesabschluss</span><span>${s.day_close}</span></div>
        <div class="detail-row"><span>Tage gestartet</span><span>${s.day_start}</span></div>
        <div class="detail-row"><span>Sitzphasen beendet</span><span>${s.sit_done}</span></div>
        <div class="detail-row"><span>Stehphasen beendet</span><span>${s.stand_done}</span></div>
        <div class="detail-row"><span>Resets beendet</span><span>${s.reset_done}</span></div>
        <div class="detail-row"><span>Hochfahren (Ritual)</span><span>${s.rise}</span></div>
        <div class="detail-row"><span>Lazy-Pfad gewählt</span><span>${s.lazy_choice}</span></div>
        <div class="detail-row"><span>Freeze an Schwelle</span><span>${s.freeze_choice}</span></div>
        <div class="detail-row"><span>Freeze manuell</span><span>${s.freeze_manual}</span></div>
        <div class="detail-row"><span>Ritual fertig</span><span>${s.ritual_done}</span></div>
        <div class="detail-row"><span>Ritual Skip</span><span>${s.ritual_skip}</span></div>
      </section>
    </div>
  `

  root.querySelectorAll<HTMLButtonElement>('[data-period]').forEach((btn) => {
    btn.addEventListener('click', () => {
      render(btn.dataset.period as Period)
    })
  })

  root.querySelector('#btn-refresh')?.addEventListener('click', () => render(period))
  root.querySelector('#btn-clear')?.addEventListener('click', () => {
    if (confirm('Alle lokalen Analytics löschen?')) {
      clearStats()
      render(period)
    }
  })
}

render('today')

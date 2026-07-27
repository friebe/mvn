import '@fontsource/source-sans-3/400.css'
import '@fontsource/source-sans-3/600.css'
import './settings.css'

import { ensureNotificationPermission } from './notify'
import {
  closeDayInStorage,
  getResolvedIntervals,
  readPreferences,
  setIntervals,
  togglePreference,
  writePreferences,
} from './preferences'
import { appPath } from './paths'
import {
  RESET_OPTIONS,
  SIT_OPTIONS,
  STAND_OPTIONS,
  intervalSummary,
  minutesFromMs,
  msFromMinutes,
  type UserIntervals,
} from './intervals'
import type { EnergyMode } from './state'

type IntervalPhase = 'sit' | 'stand' | 'reset'

function intervalSelect(
  mode: EnergyMode,
  phase: IntervalPhase,
  options: number[],
  intervals: UserIntervals,
): string {
  const current = minutesFromMs(intervals[mode][phase])
  const opts = options
    .map(
      (m) =>
        `<option value="${m}"${m === current ? ' selected' : ''}>${m} Min</option>`,
    )
    .join('')
  return `<select class="setting-select" data-mode="${mode}" data-phase="${phase}" aria-label="${phase}">${opts}</select>`
}

function render(): void {
  const root = document.querySelector<HTMLElement>('#app')!
  const s = readPreferences()
  const intervals = getResolvedIntervals()

  root.innerHTML = `
    <div class="settings">
      <header class="settings-top">
        <div>
          <p class="settings-brand">Einstellungen</p>
          <p class="settings-tag">MVN · lokal auf diesem Gerät</p>
        </div>
        <a class="settings-back" href="${appPath()}">Zurück</a>
      </header>

      <section class="settings-group" aria-label="Signale">
        <h2 class="settings-group-title">Signale</h2>
        <div class="setting-row">
          <div class="setting-copy">
            <p class="setting-label">Sound</p>
            <p class="setting-note">Akustische Hinweise bei Phasenwechsel.</p>
          </div>
          <button type="button" class="setting-btn ${s.soundEnabled ? 'is-on' : ''}" id="btn-sound">
            ${s.soundEnabled ? 'An' : 'Aus'}
          </button>
        </div>
        <div class="setting-row">
          <div class="setting-copy">
            <p class="setting-label">Notifications</p>
            <p class="setting-note">Browser-Hinweise — am besten als installierte App.</p>
          </div>
          <button type="button" class="setting-btn ${s.notificationsEnabled ? 'is-on' : ''}" id="btn-notif">
            ${s.notificationsEnabled ? 'An' : 'Aus'}
          </button>
        </div>
      </section>

      <section class="settings-group" aria-label="Intervalle">
        <h2 class="settings-group-title">Intervalle</h2>
        <p class="settings-hint">Gilt ab der nächsten Phase. Im Demo-Modus gelten Kurzzeiten.</p>

        <div class="interval-block">
          <h3 class="interval-mode">High Mode</h3>
          <p class="interval-summary">${intervalSummary(intervals, 'high')}</p>
          <div class="setting-row">
            <div class="setting-copy">
              <p class="setting-label">Sitzen</p>
            </div>
            ${intervalSelect('high', 'sit', SIT_OPTIONS.high, intervals)}
          </div>
          <div class="setting-row">
            <div class="setting-copy">
              <p class="setting-label">Stehen</p>
            </div>
            ${intervalSelect('high', 'stand', STAND_OPTIONS.high, intervals)}
          </div>
          <div class="setting-row">
            <div class="setting-copy">
              <p class="setting-label">Reset</p>
            </div>
            ${intervalSelect('high', 'reset', RESET_OPTIONS.high, intervals)}
          </div>
        </div>

        <div class="interval-block">
          <h3 class="interval-mode">Lazy Mode</h3>
          <p class="interval-summary">${intervalSummary(intervals, 'lazy')}</p>
          <div class="setting-row">
            <div class="setting-copy">
              <p class="setting-label">Sitzen</p>
            </div>
            ${intervalSelect('lazy', 'sit', SIT_OPTIONS.lazy, intervals)}
          </div>
          <div class="setting-row">
            <div class="setting-copy">
              <p class="setting-label">Stehen</p>
            </div>
            ${intervalSelect('lazy', 'stand', STAND_OPTIONS.lazy, intervals)}
          </div>
          <div class="setting-row">
            <div class="setting-copy">
              <p class="setting-label">Reset</p>
            </div>
            ${intervalSelect('lazy', 'reset', RESET_OPTIONS.lazy, intervals)}
          </div>
        </div>
      </section>

      <section class="settings-group" aria-label="Sonstiges">
        <h2 class="settings-group-title">Sonstiges</h2>
        <div class="setting-row">
          <div class="setting-copy">
            <p class="setting-label">Demo</p>
            <p class="setting-note">Kurze Intervalle zum Testen des Flows.</p>
          </div>
          <button type="button" class="setting-btn ${s.demo ? 'is-on' : ''}" id="btn-demo">
            ${s.demo ? 'An' : 'Aus'}
          </button>
        </div>
        <div class="setting-row">
          <div class="setting-copy">
            <p class="setting-label">Tagesabschluss</p>
            <p class="setting-note">Tag beenden und Timer zurücksetzen.</p>
          </div>
          <button type="button" class="setting-btn danger" id="btn-close-day">Beenden</button>
        </div>
      </section>
    </div>
  `

  root.querySelector('#btn-sound')?.addEventListener('click', () => {
    togglePreference('soundEnabled')
    render()
  })

  root.querySelector('#btn-notif')?.addEventListener('click', async () => {
    const current = readPreferences()
    if (!current.notificationsEnabled) {
      const ok = await ensureNotificationPermission()
      writePreferences({ notificationsEnabled: ok })
    } else {
      writePreferences({ notificationsEnabled: false })
    }
    render()
  })

  root.querySelector('#btn-demo')?.addEventListener('click', () => {
    togglePreference('demo')
    render()
  })

  root.querySelector('#btn-close-day')?.addEventListener('click', () => {
    if (confirm('Tagesabschluss — Timer zurücksetzen?')) {
      const { story } = closeDayInStorage()
      alert(story)
      window.location.href = appPath()
    }
  })

  root.querySelectorAll<HTMLSelectElement>('.setting-select').forEach((select) => {
    select.addEventListener('change', () => {
      const mode = select.dataset.mode as EnergyMode
      const phase = select.dataset.phase as IntervalPhase
      const minutes = Number(select.value)
      const next = getResolvedIntervals()
      next[mode] = { ...next[mode], [phase]: msFromMinutes(minutes) }
      setIntervals(next)
      render()
    })
  })
}

render()

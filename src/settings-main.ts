import '@fontsource/source-sans-3/400.css'
import '@fontsource/source-sans-3/600.css'
import './settings.css'

import { ensureNotificationPermission } from './notify'
import {
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
import {
  shortcutsByContext,
} from './shortcuts'
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
  const shortcutGroups = shortcutsByContext()

  root.innerHTML = `
    <div class="settings">
      <header class="settings-top">
        <a class="back-link" href="${appPath()}" aria-label="Zurück zur App" title="Zurück">
          <svg class="back-icon" viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false">
            <path
              fill="currentColor"
              d="M15.41 7.41 14 6l-6 6 6 6 1.41-1.41L10.83 12z"
            />
          </svg>
        </a>
        <div class="settings-heading">
          <p class="settings-brand">Einstellungen</p>
          <p class="settings-tag">MVN · lokal auf diesem Gerät</p>
        </div>
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
        <div class="setting-row">
          <div class="setting-copy">
            <p class="setting-label">Toast sichtbar halten</p>
            <p class="setting-note">
              Bleibt am Bildschirm bis du wegklickst. Hilft auf Windows, wenn nur das Info-Center blinkt.
              Sekunden-Dauer steuert Windows selbst — nicht die App.
            </p>
          </div>
          <button
            type="button"
            class="setting-btn ${s.notificationPersistent ? 'is-on' : ''}"
            id="btn-notif-persistent"
            ${s.notificationsEnabled ? '' : 'disabled'}
          >
            ${s.notificationPersistent ? 'An' : 'Aus'}
          </button>
        </div>
        <p class="settings-hint settings-hint-tight">
          Windows: Einstellungen → System → Benachrichtigungen → MVN → „Banner“ aktivieren.
          Fokusassistenz kann Toasts unterdrücken.
        </p>
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

      <section class="settings-group" aria-label="Tastenkürzel">
        <h2 class="settings-group-title">Tastenkürzel</h2>
        <p class="settings-hint">Nur wenn MVN fokussiert ist — kein globaler System-Shortcut.</p>
        <div class="setting-row">
          <div class="setting-copy">
            <p class="setting-label">Hinweise auf Buttons</p>
            <p class="setting-note">Kleine graue Kürzel neben den Aktionen.</p>
          </div>
          <button
            type="button"
            class="setting-btn ${s.shortcutHintsEnabled !== false ? 'is-on' : ''}"
            id="btn-shortcut-hints"
          >
            ${s.shortcutHintsEnabled !== false ? 'An' : 'Aus'}
          </button>
        </div>
        <div class="shortcut-list" aria-label="Shortcut-Übersicht">
          ${[...shortcutGroups.entries()]
            .map(
              ([context, items]) => `
            <div class="shortcut-group">
              <p class="shortcut-context">${context}</p>
              ${items
                .map(
                  (item) => `
                <div class="shortcut-row">
                  <span class="shortcut-action">${item.action}</span>
                  <kbd class="shortcut-key">${item.label}</kbd>
                </div>`,
                )
                .join('')}
            </div>`,
            )
            .join('')}
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

  root.querySelector('#btn-notif-persistent')?.addEventListener('click', () => {
    togglePreference('notificationPersistent')
    render()
  })

  root.querySelector('#btn-demo')?.addEventListener('click', () => {
    togglePreference('demo')
    render()
  })

  root.querySelector('#btn-shortcut-hints')?.addEventListener('click', () => {
    togglePreference('shortcutHintsEnabled')
    render()
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

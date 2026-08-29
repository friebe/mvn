import '@fontsource/source-sans-3/400.css'
import '@fontsource/source-sans-3/600.css'
import './settings.css'

import { ensureNotificationPermission } from './notify'
import {
  getResolvedIntervals,
  getResolvedMomentDuration,
  readPreferences,
  setIntervals,
  setMomentDuration,
  togglePreference,
  writePreferences,
} from './preferences'
import { appPath } from './paths'
import {
  MOMENT_DURATION_OPTIONS_SEC,
  SIT_OPTIONS,
  STAND_OPTIONS,
  intervalSummary,
  minutesFromMs,
  msFromMinutes,
  secondsFromMs,
  type UserIntervals,
} from './intervals'
import {
  shortcutsByContext,
} from './shortcuts'
import type { AtmosphereDisplay } from './state'
import { brandLockupHtml, BRAND_TAG, HEADER_MARK_SIZE } from './brand-mark'
import {
  ATMOSPHERE_DISPLAY_LABELS,
  ATMOSPHERE_DISPLAY_NOTES,
  ATMOSPHERE_DISPLAY_ORDER,
} from './atmosphere-display'
import {
  THEME_LABELS,
  THEME_NOTES,
  THEME_ORDER,
  applyThemeFromState,
  bindSystemThemeListener,
  type ThemePreference,
} from './theme'
import {
  canInstallPwa,
  installManualHint,
  onInstallAvailability,
  promptInstallPwa,
  registerPwa,
  shouldOfferInstall,
} from './pwa'
import { markSettingsSeen } from './settings-cue'

registerPwa()
markSettingsSeen()
applyThemeFromState(readPreferences())
bindSystemThemeListener(() => readPreferences().theme)

type IntervalPhase = 'sit' | 'stand'

function installSectionHtml(): string {
  if (!shouldOfferInstall()) return ''
  const ready = canInstallPwa()
  return `
      <section class="settings-group settings-group-install" aria-label="Install">
        <h2 class="settings-group-title">Install Stint</h2>
        <p class="settings-hint">
          Second monitor, desktop icon, and more reliable notifications — “Not now” on the home
          banner only hides it for a while; you can always install from here.
        </p>
        <div class="setting-row">
          <div class="setting-copy">
            <p class="setting-label">Add as app</p>
            <p class="setting-note">
              ${
                ready
                  ? 'Opens the browser install dialog.'
                  : installManualHint()
              }
            </p>
          </div>
          ${
            ready
              ? `<button type="button" class="setting-btn is-on" id="btn-settings-install">Install</button>`
              : `<span class="setting-status" id="install-status">Manual</span>`
          }
        </div>
      </section>`
}

function intervalSelect(
  phase: IntervalPhase,
  options: number[],
  intervals: UserIntervals,
): string {
  const current = minutesFromMs(intervals[phase])
  const opts = options
    .map(
      (m) =>
        `<option value="${m}"${m === current ? ' selected' : ''}>${m} min</option>`,
    )
    .join('')
  return `<select class="setting-select" data-phase="${phase}" aria-label="${phase}">${opts}</select>`
}

function momentDurationSelect(currentSec: number): string {
  const opts = MOMENT_DURATION_OPTIONS_SEC.map(
    (s) =>
      `<option value="${s}"${s === currentSec ? ' selected' : ''}>${s} s</option>`,
  ).join('')
  return `<select class="setting-select" data-moment-duration aria-label="Micro-move duration">${opts}</select>`
}

function render(): void {
  const root = document.querySelector<HTMLElement>('#app')!
  const s = readPreferences()
  const intervals = getResolvedIntervals()
  const momentDurationSec = secondsFromMs(getResolvedMomentDuration())
  const shortcutGroups = shortcutsByContext()

  root.innerHTML = `
    <div class="settings">
      <header class="settings-top">
        <a class="back-link" href="${appPath()}" aria-label="Back to app" title="Back">
          <svg class="back-icon" viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false">
            <path
              fill="currentColor"
              d="M15.41 7.41 14 6l-6 6 6 6 1.41-1.41L10.83 12z"
            />
          </svg>
        </a>
        <div class="settings-heading app-header-brand">
          ${brandLockupHtml(BRAND_TAG, HEADER_MARK_SIZE)}
        </div>
      </header>

      ${installSectionHtml()}

      <section class="settings-group" aria-label="Signals">
        <h2 class="settings-group-title">Signals</h2>
        <div class="setting-row">
          <div class="setting-copy">
            <p class="setting-label">Sound</p>
            <p class="setting-note">
              Cues on phase changes and when a micro-moment ends — useful if you stepped to the window.
            </p>
          </div>
          <button type="button" class="setting-btn ${s.soundEnabled ? 'is-on' : ''}" id="btn-sound">
            ${s.soundEnabled ? 'On' : 'Off'}
          </button>
        </div>
        <div class="setting-row">
          <div class="setting-copy">
            <p class="setting-label">Notifications</p>
            <p class="setting-note">
              Browser toasts — best as an installed app. With this on, when another window is focused
              Stint repeats desk / check-in cues every ~75s (one toast at a time, auto-dismisses).
              Standing check-in toasts include a Yes button — optional proof you stayed up, without switching
              apps. After ~15s without Yes, it does not count. Sit has no check-in. Desk toasts include +5 min — stay in the current posture without
              focusing Stint (twice per cue).
            </p>
          </div>
          <button type="button" class="setting-btn ${s.notificationsEnabled ? 'is-on' : ''}" id="btn-notif">
            ${s.notificationsEnabled ? 'On' : 'Off'}
          </button>
        </div>
        <div class="setting-row">
          <div class="setting-copy">
            <p class="setting-label">Keep toast visible</p>
            <p class="setting-note">
              Stays on screen until you dismiss it. Helps on Windows when only the action center blinks.
              Display duration is controlled by Windows — not the app.
            </p>
          </div>
          <button
            type="button"
            class="setting-btn ${s.notificationPersistent ? 'is-on' : ''}"
            id="btn-notif-persistent"
            ${s.notificationsEnabled ? '' : 'disabled'}
          >
            ${s.notificationPersistent ? 'On' : 'Off'}
          </button>
        </div>
        <p class="settings-hint settings-hint-tight">
          Windows: Settings → System → Notifications → Stint → enable “Banners”.
          Focus assist can suppress toasts.
        </p>
      </section>

      <section class="settings-group" aria-label="Appearance">
        <h2 class="settings-group-title">Appearance</h2>
        <p class="settings-hint">
          Desk Daylight or Desk Evening — soft contrast for a long sit. System follows your OS.
        </p>
        <div class="display-tabs" role="radiogroup" aria-label="Theme">
          ${THEME_ORDER.map(
            (mode) => `
          <button
            type="button"
            role="radio"
            class="display-tab${(s.theme ?? 'system') === mode ? ' is-on' : ''}"
            data-theme-pref="${mode}"
            aria-checked="${(s.theme ?? 'system') === mode}"
          >${THEME_LABELS[mode]}</button>`,
          ).join('')}
        </div>
        <p class="settings-hint settings-hint-tight" id="theme-note">
          ${THEME_NOTES[s.theme ?? 'system']}
        </p>
      </section>

      <section class="settings-group" aria-label="Atmosphere display">
        <h2 class="settings-group-title">Atmosphere display</h2>
        <p class="settings-hint">
          How the main screen shows time in a block — soft words, time left, or bar only.
        </p>
        <div class="display-tabs" role="radiogroup" aria-label="Atmosphere display">
          ${ATMOSPHERE_DISPLAY_ORDER.map(
            (mode) => `
          <button
            type="button"
            role="radio"
            class="display-tab${s.atmosphereDisplay === mode ? ' is-on' : ''}"
            data-atmosphere="${mode}"
            aria-checked="${s.atmosphereDisplay === mode}"
          >${ATMOSPHERE_DISPLAY_LABELS[mode]}</button>`,
          ).join('')}
        </div>
        <p class="settings-hint settings-hint-tight" id="atmosphere-display-note">
          ${ATMOSPHERE_DISPLAY_NOTES[s.atmosphereDisplay ?? 'clock']}
        </p>
      </section>

      <section class="settings-group" aria-label="Intervals">
        <h2 class="settings-group-title">Intervals</h2>
        <p class="settings-hint">
          Long sit and stand blocks — not Pomodoro. At each desk switch, an optional micro-move.
        </p>
        <p class="interval-summary">${intervalSummary(intervals)}</p>
        <div class="setting-row">
          <div class="setting-copy">
            <p class="setting-label">Sitting</p>
          </div>
          ${intervalSelect('sit', SIT_OPTIONS, intervals)}
        </div>
        <div class="setting-row">
          <div class="setting-copy">
            <p class="setting-label">Standing</p>
          </div>
          ${intervalSelect('stand', STAND_OPTIONS, intervals)}
        </div>
        <div class="setting-row">
          <div class="setting-copy">
            <p class="setting-label">Micro-move</p>
            <p class="setting-note">
              How long a moment runs after you pick a card. Done (↵) anytime — desk maintenance, not a workout.
              At 30s or 45s, hold-style moves and longer cues are preferred.
            </p>
          </div>
          ${momentDurationSelect(momentDurationSec)}
        </div>
      </section>

      <section class="settings-group" aria-label="Keyboard shortcuts">
        <h2 class="settings-group-title">Keyboard shortcuts</h2>
        <p class="settings-hint">Only while Stint is focused — not a global OS shortcut.</p>
        <div class="setting-row">
          <div class="setting-copy">
            <p class="setting-label">Hints on buttons</p>
            <p class="setting-note">Small grey key labels next to actions.</p>
          </div>
          <button
            type="button"
            class="setting-btn ${s.shortcutHintsEnabled !== false ? 'is-on' : ''}"
            id="btn-shortcut-hints"
          >
            ${s.shortcutHintsEnabled !== false ? 'On' : 'Off'}
          </button>
        </div>
        <div class="shortcut-list" aria-label="Shortcut overview">
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

      <section class="settings-group" aria-label="Other">
        <h2 class="settings-group-title">Other</h2>
        <div class="setting-row">
          <div class="setting-copy">
            <p class="setting-label">Demo</p>
            <p class="setting-note">Short intervals to try the full loop.</p>
          </div>
          <button type="button" class="setting-btn ${s.demo ? 'is-on' : ''}" id="btn-demo">
            ${s.demo ? 'On' : 'Off'}
          </button>
        </div>
        <div class="setting-row">
          <div class="setting-copy">
            <p class="setting-label">Loop tour</p>
            <p class="setting-note">
              Sit → desk cue → moment → stand in about half a minute — for first visits or a quick refresh.
            </p>
          </div>
          <a class="setting-link" id="link-walkthrough" href="${appPath('')}?tour=1">Replay</a>
        </div>
        <div class="setting-row">
          <div class="setting-copy">
            <p class="setting-label">Blog</p>
            <p class="setting-note">
              Sit/stand rhythm, soft reminders, micro-moves — German how-tos, no hustle feed.
            </p>
          </div>
          <a class="setting-link" id="link-blog" href="${appPath('blog/')}">Open</a>
        </div>
        <p class="settings-hint">
          Micro-moments (exercises) stay in German for now — clearer body cues.
        </p>
        <p class="settings-version">Stint ${__APP_VERSION__}</p>
      </section>
    </div>
  `

  root.querySelector('#btn-settings-install')?.addEventListener('click', async () => {
    await promptInstallPwa()
    render()
  })

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

  root.querySelectorAll<HTMLButtonElement>('[data-theme-pref]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const mode = btn.dataset.themePref as ThemePreference
      writePreferences({ theme: mode })
      applyThemeFromState(readPreferences())
      render()
    })
  })

  root.querySelectorAll<HTMLButtonElement>('[data-atmosphere]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const mode = btn.dataset.atmosphere as AtmosphereDisplay
      writePreferences({ atmosphereDisplay: mode })
      render()
    })
  })

  root.querySelectorAll<HTMLSelectElement>('.setting-select[data-phase]').forEach((select) => {
    select.addEventListener('change', () => {
      const phase = select.dataset.phase as IntervalPhase
      const minutes = Number(select.value)
      const next = { ...getResolvedIntervals(), [phase]: msFromMinutes(minutes) }
      setIntervals(next)
      render()
    })
  })

  root.querySelector<HTMLSelectElement>('[data-moment-duration]')?.addEventListener('change', (e) => {
    const seconds = Number((e.currentTarget as HTMLSelectElement).value)
    setMomentDuration(seconds)
    render()
  })
}

render()
onInstallAvailability(() => {
  if (document.querySelector('.settings')) render()
})

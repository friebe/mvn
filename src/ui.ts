import type { AppState } from './state'
import { getMoment, kindLabel, MOMENTS } from './exercises'
import { MOTIVATIONS } from './motivation'
import {
  momentOrderHint,
  phaseLabel,
  pickLead,
  runningPhaseHint,
  skipMomentLabel,
  thresholdLead,
  thresholdRiseLabel,
  thresholdSkipLabel,
  thresholdSub,
} from './modes'
import { fillLevel, formatExactTime, formatRemainingPercent, softTimeLabel } from './atmosphere'
import { intervalSummary, resolveIntervals } from './intervals'
import { appPath } from './paths'
import { canSnoozePostureNow, isCheckInVisible } from './timer'
import { buildDayCloseComparison, buildDayStory, type StatsSummary } from './stats'
import { weekFocusLabel } from './week-focus'
import { shortcutHintLabel, type ShortcutId } from './shortcuts'
import { detailMode, isBarOnly } from './atmosphere-display'
import { brandLockupHtml } from './brand-mark'
import { resolveTheme } from './theme'
import { hasSeenSettings, markSettingsSeen } from './settings-cue'

export interface UiHandlers {
  onStart: () => void
  onFreeze: () => void
  onResume: () => void
  onExtendFreeze: () => void
  onAfterplay: () => void
  onSkipStanding: () => void
  onCompleteMoment: () => void
  onRerollMoment: () => void
  onChooseMoment: (id: string) => void
  onConfirmCheckIn: () => void
  onSnoozePosture: () => void
  onToggleLazy: () => void
  onToggleClock: () => void
  onToggleTheme: () => void
  onInstall: () => void
  onDismissInstall: () => void
  onChooseRise: () => void
  onChooseLazyPath: () => void
  onCloseDay: () => void
  onDismissDayClose: () => void
}

const RETURN_AWAY_MS = 20_000
const RETURN_PULSE_MS = 8_000
let hiddenAt: number | null = null
let returnOrientationUntil = 0
let returnOrientationTimer: number | null = null
let dayCloseSummary: StatsSummary | null = null
/** Skip shortcut DOM walks when the timer only ticked remaining time. */
let lastShortcutHintState: AppState | null = null

function setText(el: HTMLElement | null | undefined, text: string): void {
  if (!el || el.textContent === text) return
  el.textContent = text
}

function setHidden(el: HTMLElement | null | undefined, hidden: boolean): void {
  if (!el || el.hidden === hidden) return
  el.hidden = hidden
}

function setAttr(el: Element | null | undefined, name: string, value: string): void {
  if (!el || el.getAttribute(name) === value) return
  el.setAttribute(name, value)
}

function setData(el: HTMLElement, key: string, value: string | null): void {
  if (value == null) {
    if (key in el.dataset) delete el.dataset[key]
    return
  }
  if (el.dataset[key] === value) return
  el.dataset[key] = value
}

function setButtonLabel(btn: HTMLElement, text: string): void {
  const label = btn.querySelector<HTMLElement>('.btn-text')
  if (label) setText(label, text)
  else setText(btn, text)
}

function setHintLines(hint: HTMLElement, rhythm: string, tag: string): void {
  const key = `${rhythm}\n${tag}`
  if (hint.dataset.hintKey === key) return
  hint.dataset.hintKey = key
  hint.innerHTML = `<span class="hint-rhythm">${rhythm}</span><span class="hint-tag">${tag}</span>`
}

function setHintText(hint: HTMLElement, text: string): void {
  if (hint.dataset.hintKey) delete hint.dataset.hintKey
  setText(hint, text)
}

function setMomentCards(cards: HTMLElement, ids: string[]): boolean {
  const key = ids.join(',')
  if (cards.dataset.momentIds === key) return false
  cards.dataset.momentIds = key
  cards.innerHTML = ids
    .map((id) => {
      const m = getMoment(id) ?? MOMENTS[0]!
      return `<button type="button" class="moment-choice" data-moment-id="${m.id}">
          <span class="moment-kind">${kindLabel(m.kind)}</span>
          <span class="moment-title">${m.title}</span>
        </button>`
    })
    .join('')
  return true
}

function actionButton(
  id: string,
  classes: string,
  label: string,
  shortcut: ShortcutId | null,
  hidden = false,
): string {
  const kbd = shortcut
    ? `<span class="btn-kbd" aria-hidden="true">${shortcutHintLabel(shortcut)}</span>`
    : ''
  const shortcutAttr = shortcut ? ` data-shortcut="${shortcut}"` : ''
  const hiddenAttr = hidden ? ' hidden' : ''
  return `<button type="button" class="${classes}${shortcut ? ' has-kbd' : ''}" id="${id}"${shortcutAttr}${hiddenAttr}>
    <span class="btn-text">${label}</span>${kbd}
  </button>`
}

function applyShortcutHints(root: HTMLElement, enabled: boolean): void {
  root.querySelectorAll<HTMLButtonElement>('[data-shortcut]').forEach((btn) => {
    const id = btn.dataset.shortcut as ShortcutId
    const kbd = btn.querySelector<HTMLElement>('.btn-kbd')
    const label = shortcutHintLabel(id)
    if (kbd) {
      setText(kbd, label)
      setHidden(kbd, !enabled)
    }
    btn.classList.toggle('has-kbd', enabled && Boolean(kbd))
  })

  root.querySelectorAll<HTMLElement>('.moment-choice').forEach((card, index) => {
    let kbd = card.querySelector<HTMLElement>('.btn-kbd')
    if (enabled) {
      if (!kbd) {
        kbd = document.createElement('span')
        kbd.className = 'btn-kbd'
        kbd.setAttribute('aria-hidden', 'true')
        card.appendChild(kbd)
      }
      setText(kbd, String(index + 1))
      setHidden(kbd, false)
      card.classList.add('has-kbd')
    } else {
      kbd?.remove()
      card.classList.remove('has-kbd')
    }
  })
}

export function isReturnOrientationActive(): boolean {
  return Date.now() < returnOrientationUntil
}

function pulseReturnOrientation(onEnded?: () => void): void {
  returnOrientationUntil = Date.now() + RETURN_PULSE_MS
  if (returnOrientationTimer != null) window.clearTimeout(returnOrientationTimer)
  returnOrientationTimer = window.setTimeout(() => {
    returnOrientationTimer = null
    onEnded?.()
  }, RETURN_PULSE_MS)
}

/** After being away, briefly show exact time and highlight status. */
export function bindReturnOrientation(onPulse: () => void): () => void {
  const onVisibility = () => {
    if (document.visibilityState === 'hidden') {
      hiddenAt = Date.now()
      return
    }
    if (hiddenAt != null && Date.now() - hiddenAt >= RETURN_AWAY_MS) {
      pulseReturnOrientation(onPulse)
      onPulse()
    }
    hiddenAt = null
  }
  document.addEventListener('visibilitychange', onVisibility)
  return () => {
    document.removeEventListener('visibilitychange', onVisibility)
    if (returnOrientationTimer != null) {
      window.clearTimeout(returnOrientationTimer)
      returnOrientationTimer = null
    }
  }
}

export function showDayCloseReward(summary: StatsSummary): void {
  dayCloseSummary = summary
}

export function dismissDayCloseReward(): void {
  dayCloseSummary = null
}

export function isDayCloseRewardVisible(): boolean {
  return dayCloseSummary != null
}

function qs<T extends HTMLElement>(root: HTMLElement, id: string): T {
  return root.querySelector(`#${id}`) as T
}

export function mountUi(root: HTMLElement, handlers: UiHandlers): void {
  root.innerHTML = `
    <div class="shell" data-phase="setup">
      <div class="frame">
      <section class="install-banner" id="install-banner" hidden>
        <div class="install-copy">
          <p class="install-title">Install Stint</p>
          <p class="install-text">Better for a second monitor, notifications, and a permanent spot on your desktop.</p>
        </div>
        <div class="install-actions">
          <button type="button" class="btn btn-primary" id="btn-install">Install app</button>
          <button type="button" class="install-dismiss" id="btn-install-dismiss">Not now</button>
        </div>
      </section>

      <header class="top">
        <div class="top-brand">
          ${brandLockupHtml()}
        </div>
        <nav class="top-actions" aria-label="App">
          <button
            type="button"
            class="icon-link"
            id="btn-theme"
            aria-label="Switch to dark theme"
            title="Theme"
          >
            <svg class="icon" id="icon-theme" viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false">
              <path
                id="icon-theme-path"
                fill="currentColor"
                d="M12 3a9 9 0 1 0 9 9c0-.5-.04-.98-.1-1.45a7 7 0 1 1-7.45-7.45C12.98 3.04 12.5 3 12 3z"
              />
            </svg>
          </button>
          <a class="icon-link" href="${appPath('analytics.html')}" aria-label="Analytics" title="Analytics">
            <svg class="icon" viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false">
              <path
                fill="currentColor"
                d="M5 19V9h2.5v10H5Zm5.75 0V5h2.5v14h-2.5ZM16.5 19v-6H19v6h-2.5Z"
              />
            </svg>
          </a>
          <a
            class="icon-link${hasSeenSettings() ? '' : ' has-cue'}"
            id="link-settings"
            href="${appPath('settings.html')}"
            aria-label="${hasSeenSettings() ? 'Settings' : 'Settings — open to explore sound, notifications, and intervals'}"
            title="Settings"
          >
            <svg class="icon" viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false">
              <path
                fill="currentColor"
                d="M19.14 12.94c.04-.31.06-.63.06-.94s-.02-.63-.06-.94l2.03-1.58a.5.5 0 0 0 .12-.64l-1.92-3.32a.5.5 0 0 0-.6-.22l-2.39.96a7.03 7.03 0 0 0-1.63-.94l-.36-2.54A.5.5 0 0 0 14.3 2h-4.6a.5.5 0 0 0-.49.42l-.36 2.54c-.58.23-1.12.54-1.63.94l-2.39-.96a.5.5 0 0 0-.6.22L2.31 8.48a.5.5 0 0 0 .12.64L4.46 10.7c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58a.5.5 0 0 0-.12.64l1.92 3.32c.14.24.43.34.68.22l2.39-.96c.5.4 1.05.72 1.63.94l.36 2.54c.05.24.25.42.49.42h4.6c.24 0 .44-.18.49-.42l.36-2.54c.58-.22 1.12-.54 1.63-.94l2.39.96c.25.12.54.02.68-.22l1.92-3.32a.5.5 0 0 0-.12-.64l-2.03-1.58ZM12 15.5A3.5 3.5 0 1 1 12 8.5a3.5 3.5 0 0 1 0 7Z"
              />
            </svg>
            <span class="nav-cue" aria-hidden="true"></span>
          </a>
        </nav>
      </header>

      <div class="content-area">
        <div class="middle">
          <main class="stage">
            <p class="phase-label" id="phase-label">Ready</p>
            <div class="atmosphere" id="atmosphere">
              <button
                type="button"
                class="atmosphere-hit"
                id="btn-atmosphere-label"
                aria-live="polite"
                aria-label="Phase — tap to cycle display"
              >
                <span class="atmosphere-label" id="atmosphere-label">·</span>
              </button>
              <div class="desk-edge-row">
                <button
                  type="button"
                  class="desk-edge"
                  id="btn-desk-edge"
                  aria-label="Progress — tap to cycle display"
                >
                  <span class="desk-edge-fill" id="desk-edge-fill"></span>
                </button>
              </div>
            </div>
            <p class="hint" id="hint">Long sit blocks, tiny move at the desk switch — not a focus timer.</p>
            <p class="ambient" id="ambient" hidden></p>
            <p class="mute-hint" id="mute-hint" hidden></p>
          </main>

          <section class="check-in" id="check-in" hidden>
            <p class="check-in-q" id="check-in-q">Still at your desk?</p>
            <button type="button" class="btn btn-primary has-kbd" id="btn-check-in" data-shortcut="checkIn">
              <span class="btn-text">Yes</span>
              <span class="btn-kbd" aria-hidden="true">↵</span>
            </button>
          </section>

          <section class="threshold" id="threshold" hidden>
            <p class="threshold-lead" id="threshold-lead">Desk wants up.</p>
            <p class="threshold-sub" id="threshold-sub">Nothing to prove. Pick what works today.</p>
          </section>

          <section class="freeze-prompt" id="freeze-prompt" hidden>
            <p class="freeze-q">Call over?</p>
          </section>

          <section class="pick" id="pick" hidden>
            <p class="pick-lead" id="pick-lead">Raise the desk and move briefly.</p>
            <div class="moment-list" id="moment-cards"></div>
          </section>

          <section class="exercise" id="exercise" hidden>
            <p class="ritual-kicker" id="ritual-kicker">Moment</p>
            <p class="exercise-title" id="exercise-title"></p>
            <p class="exercise-hint" id="exercise-hint"></p>
            <p class="motivation" id="motivation"></p>
          </section>

          <section class="day-close-reward" id="day-close-reward" hidden>
            <p class="day-close-kicker">Day closed</p>
            <p class="day-close-story" id="day-close-story"></p>
            <p class="day-close-line" id="day-close-line" hidden></p>
            <div class="day-close-stats" id="day-close-stats" aria-label="Day stats"></div>
            <a class="day-close-more" id="day-close-more" href="${appPath('analytics.html')}">All analytics</a>
          </section>

          <nav class="primary-actions" id="primary-actions" aria-label="Actions">
            <div class="row day-close-actions" id="day-close-actions" hidden>
              ${actionButton('btn-day-close-done', 'btn btn-primary', 'Continue', 'dayCloseDone')}
            </div>
            <div class="row setup-actions" id="setup-controls">
              ${actionButton('btn-start', 'btn btn-primary', 'Start', 'start')}
            </div>
            <div class="row run-actions" id="run-controls" hidden>
              ${actionButton('btn-freeze', 'btn btn-danger', 'Freeze', 'freeze')}
              ${actionButton('btn-resume', 'btn btn-primary', 'Continue', 'resume', true)}
            </div>
            <div class="row threshold-actions" id="threshold-actions" hidden>
              ${actionButton('btn-rise', 'btn btn-primary', 'Move briefly', 'rise')}
              ${actionButton('btn-threshold-skip', 'btn btn-ghost', 'Just sit', 'skipStanding')}
              <div class="row threshold-secondary">
                ${actionButton('btn-snooze', 'btn btn-ghost', '+5 min', null)}
                ${actionButton('btn-lazy-path', 'btn btn-ghost', 'Lazy continue', 'lazyPath')}
              </div>
            </div>
            <div class="row pick-actions" id="pick-actions" hidden>
              ${actionButton('btn-skip-standing', 'btn btn-primary', 'Standing is enough today', 'skipStanding')}
            </div>
            <div class="row freeze-actions" id="freeze-actions" hidden>
              ${actionButton('btn-afterplay', 'btn btn-primary', 'Call cooldown', 'afterplay')}
              ${actionButton('btn-call-done', 'btn btn-ghost', 'Resume now', 'resume')}
              ${actionButton('btn-extend', 'btn btn-ghost', '15 more min', 'extendFreeze')}
            </div>
            <div class="row exercise-actions" id="exercise-actions" hidden>
              ${actionButton('btn-done-moment', 'btn btn-primary', 'Done', 'doneMoment')}
              ${actionButton('btn-reroll', 'btn btn-ghost', 'Another moment', 'reroll')}
              ${actionButton('btn-skip-standing-ex', 'btn btn-ghost', 'Standing is enough today', 'skipStanding')}
            </div>
            <div class="row quick-actions" id="quick-actions">
              ${actionButton('btn-lazy', 'btn btn-ghost', 'Lazy Mode', 'toggleLazy')}
              ${actionButton('btn-close-day', 'btn btn-ghost btn-end-day', 'End day', null, true)}
            </div>
          </nav>
        </div>
      </div>
      </div>
    </div>
  `

  qs(root, 'btn-start').addEventListener('click', handlers.onStart)
  qs(root, 'btn-freeze').addEventListener('click', handlers.onFreeze)
  qs(root, 'btn-resume').addEventListener('click', handlers.onResume)
  qs(root, 'btn-call-done').addEventListener('click', handlers.onResume)
  qs(root, 'btn-afterplay').addEventListener('click', handlers.onAfterplay)
  qs(root, 'btn-extend').addEventListener('click', handlers.onExtendFreeze)
  qs(root, 'btn-skip-standing').addEventListener('click', handlers.onSkipStanding)
  qs(root, 'btn-skip-standing-ex').addEventListener('click', handlers.onSkipStanding)
  qs(root, 'btn-threshold-skip').addEventListener('click', handlers.onSkipStanding)
  qs(root, 'btn-done-moment').addEventListener('click', handlers.onCompleteMoment)
  qs(root, 'btn-reroll').addEventListener('click', handlers.onRerollMoment)
  qs(root, 'btn-check-in').addEventListener('click', handlers.onConfirmCheckIn)
  qs(root, 'btn-lazy').addEventListener('click', handlers.onToggleLazy)
  qs(root, 'btn-close-day').addEventListener('click', handlers.onCloseDay)
  qs(root, 'btn-theme').addEventListener('click', handlers.onToggleTheme)
  qs(root, 'btn-atmosphere-label').addEventListener('click', handlers.onToggleClock)
  qs(root, 'btn-desk-edge').addEventListener('click', handlers.onToggleClock)
  qs(root, 'btn-install').addEventListener('click', handlers.onInstall)
  qs(root, 'btn-install-dismiss').addEventListener('click', handlers.onDismissInstall)
  qs(root, 'btn-rise').addEventListener('click', handlers.onChooseRise)
  qs(root, 'btn-snooze').addEventListener('click', handlers.onSnoozePosture)
  qs(root, 'btn-lazy-path').addEventListener('click', handlers.onChooseLazyPath)
  qs(root, 'btn-day-close-done').addEventListener('click', handlers.onDismissDayClose)

  qs(root, 'link-settings').addEventListener('click', () => {
    markSettingsSeen()
    qs(root, 'link-settings').classList.remove('has-cue')
    qs(root, 'link-settings').setAttribute('aria-label', 'Settings')
  })

  qs(root, 'moment-cards').addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-moment-id]')
    if (!btn?.dataset.momentId) return
    handlers.onChooseMoment(btn.dataset.momentId)
  })
}

export function setInstallVisible(root: HTMLElement, visible: boolean): void {
  const banner = qs<HTMLElement>(root, 'install-banner')
  if (!banner) return
  setHidden(banner, !visible)
}

const COMPACT_HEIGHT_MQ = '(max-height: 900px)'

export function updateCompactMode(root: HTMLElement): void {
  const shell = root.querySelector('.shell') as HTMLElement | null
  if (!shell) return
  const next = window.matchMedia(COMPACT_HEIGHT_MQ).matches ? 'true' : 'false'
  if (shell.dataset.compact !== next) shell.dataset.compact = next
}

export function bindCompactMode(root: HTMLElement): void {
  const mq = window.matchMedia(COMPACT_HEIGHT_MQ)
  const apply = () => updateCompactMode(root)
  mq.addEventListener('change', apply)
  apply()
}

export function renderUi(
  root: HTMLElement,
  state: AppState,
  remainingMs: number,
  showFreezePrompt: boolean,
  approaching: boolean,
): void {
  const shell = root.querySelector('.shell') as HTMLElement
  const isSetup = state.phase === 'setup'
  const isFrozen = state.phase === 'frozen'
  const isExercise = state.phase === 'exercise'
  const isPick = state.phase === 'pick'
  const isThreshold = state.phase === 'threshold'
  const isRunning =
    state.phase === 'sit' || state.phase === 'stand' || state.phase === 'reset'
  const checkInVisible = isCheckInVisible()
  const dayCloseVisible = dayCloseSummary != null
  const momentChoiceAtThreshold =
    isThreshold &&
    (state.endedPhase === 'sit' || state.endedPhase === 'stand' || state.endedPhase === 'reset')
  const thresholdTimerActive = momentChoiceAtThreshold && state.phaseEndsAt != null
  const atmosphereDisplay = state.atmosphereDisplay ?? 'clock'
  const barOnly = isBarOnly(atmosphereDisplay)
  const atmosphereDetail = detailMode(atmosphereDisplay)

  setData(shell, 'phase', state.phase)
  setData(shell, 'mode', state.mode)
  setData(shell, 'demo', state.demo ? 'true' : 'false')
  setData(shell, 'approaching', approaching ? 'true' : 'false')
  setData(shell, 'muted', state.soundEnabled ? 'false' : 'true')
  setData(shell, 'started', isSetup ? 'false' : 'true')
  setData(shell, 'atmosphereDetail', atmosphereDetail)
  setData(shell, 'atmosphereDisplay', atmosphereDisplay)
  setData(shell, 'dayClose', dayCloseVisible ? 'true' : 'false')
  setData(shell, 'returning', isReturnOrientationActive() ? 'true' : 'false')
  setData(shell, 'thresholdTimer', thresholdTimerActive ? 'true' : 'false')
  const resolvedTheme = resolveTheme(state.theme ?? 'system')
  setData(shell, 'theme', resolvedTheme)
  setData(
    shell,
    'pendingNext',
    thresholdTimerActive && state.pendingNextPhase ? state.pendingNextPhase : null,
  )
  updateCompactMode(root)

  const btnTheme = qs<HTMLButtonElement>(root, 'btn-theme')
  const themePath = root.querySelector('#icon-theme-path') as SVGPathElement | null
  const darkOn = resolvedTheme === 'dark'
  // One glyph: moon (→ dark) or sun (→ light)
  const themeGlyph = darkOn
    ? 'M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10zm0-5a1 1 0 0 1 1 1v1a1 1 0 1 1-2 0V3a1 1 0 0 1 1-1zm0 17a1 1 0 0 1 1 1v1a1 1 0 1 1-2 0v-1a1 1 0 0 1 1-1zM3 11a1 1 0 0 1 1-1h1a1 1 0 1 1 0 2H4a1 1 0 0 1-1-1zm16 0a1 1 0 0 1 1-1h1a1 1 0 1 1 0 2h-1a1 1 0 0 1-1-1zM5.64 5.64a1 1 0 0 1 1.41 0l.71.71A1 1 0 1 1 6.35 7.76l-.71-.71a1 1 0 0 1 0-1.41zm11.31 11.31a1 1 0 0 1 1.41 0l.71.71a1 1 0 0 1-1.41 1.41l-.71-.71a1 1 0 0 1 0-1.41zM18.36 5.64a1 1 0 0 1 0 1.41l-.71.71a1 1 0 1 1-1.41-1.41l.71-.71a1 1 0 0 1 1.41 0zM6.35 16.24a1 1 0 0 1 0 1.41l-.71.71A1 1 0 0 1 4.22 17l.71-.71a1 1 0 0 1 1.42 0z'
    : 'M12 3a9 9 0 1 0 9 9c0-.46-.04-.91-.1-1.35a7 7 0 1 1-7.55-7.55C12.91 3.04 13.36 3 12 3z'
  setAttr(themePath, 'd', themeGlyph)
  setAttr(btnTheme, 'aria-label', darkOn ? 'Switch to light theme' : 'Switch to dark theme')
  if (btnTheme.title !== (darkOn ? 'Light' : 'Dark')) {
    btnTheme.title = darkOn ? 'Light' : 'Dark'
  }

  const phaseEl = qs(root, 'phase-label')
  const atmo = qs(root, 'atmosphere')
  const atmoLabel = qs(root, 'atmosphere-label')
  const hint = qs(root, 'hint')
  const ambient = qs(root, 'ambient')
  const threshold = qs(root, 'threshold')
  const exercise = qs(root, 'exercise')
  const freezePrompt = qs(root, 'freeze-prompt')
  const pick = qs(root, 'pick')
  const checkIn = qs(root, 'check-in')
  const setupControls = qs(root, 'setup-controls')
  const runControls = qs(root, 'run-controls')
  const btnFreeze = qs<HTMLButtonElement>(root, 'btn-freeze')
  const btnResume = qs<HTMLButtonElement>(root, 'btn-resume')
  const btnRise = qs<HTMLButtonElement>(root, 'btn-rise')
  const thresholdSkip = qs<HTMLButtonElement>(root, 'btn-threshold-skip')
  const btnSnooze = qs<HTMLButtonElement>(root, 'btn-snooze')
  const btnReroll = qs<HTMLButtonElement>(root, 'btn-reroll')
  const thresholdActions = qs(root, 'threshold-actions')
  const pickActions = qs(root, 'pick-actions')
  const freezeActions = qs(root, 'freeze-actions')
  const exerciseActions = qs(root, 'exercise-actions')
  const dayCloseReward = qs(root, 'day-close-reward')
  const dayCloseActions = qs(root, 'day-close-actions')
  const btnLazy = qs(root, 'btn-lazy')

  setHidden(setupControls, !isSetup || dayCloseVisible)
  setHidden(
    runControls,
    isSetup || isThreshold || isExercise || isPick || checkInVisible || dayCloseVisible,
  )
  setHidden(thresholdActions, !isThreshold || dayCloseVisible)
  setHidden(pickActions, !isPick || dayCloseVisible)
  setHidden(freezeActions, !(isFrozen && showFreezePrompt) || dayCloseVisible)
  setHidden(exerciseActions, !isExercise || dayCloseVisible)
  setHidden(dayCloseActions, !dayCloseVisible)
  setHidden(btnFreeze, isFrozen || isThreshold || isExercise || isPick || dayCloseVisible)
  setHidden(btnResume, !isFrozen || showFreezePrompt || dayCloseVisible)
  setHidden(freezePrompt, !(isFrozen && showFreezePrompt) || dayCloseVisible)
  setHidden(exercise, !isExercise || dayCloseVisible)
  setHidden(threshold, !isThreshold || dayCloseVisible)
  setHidden(pick, !isPick || dayCloseVisible)
  setHidden(checkIn, !checkInVisible || dayCloseVisible)
  setHidden(dayCloseReward, !dayCloseVisible)

  setHidden(btnLazy, isThreshold || isExercise || isPick || dayCloseVisible)
  const btnCloseDay = qs<HTMLButtonElement>(root, 'btn-close-day')
  setHidden(btnCloseDay, isSetup || dayCloseVisible)
  setButtonLabel(btnLazy, state.mode === 'lazy' ? 'Lazy on' : 'Lazy Mode')
  btnLazy.classList.toggle('is-on', state.mode === 'lazy')
  setHidden(btnReroll, state.momentRerolled)

  if (dayCloseVisible && dayCloseSummary) {
    setText(qs(root, 'day-close-story'), buildDayStory(dayCloseSummary))
    const comparison = buildDayCloseComparison()
    const lineEl = qs<HTMLElement>(root, 'day-close-line')
    if (comparison) {
      setText(lineEl, comparison)
      setHidden(lineEl, false)
    } else {
      setText(lineEl, '')
      setHidden(lineEl, true)
    }
    const statsEl = qs(root, 'day-close-stats')
    const statsKey = `${dayCloseSummary.rounds},${dayCloseSummary.rise},${dayCloseSummary.ritual_done}`
    if (statsEl.dataset.statsKey !== statsKey) {
      statsEl.dataset.statsKey = statsKey
      statsEl.innerHTML = `
      <div class="day-close-stat" data-tone="stand">
        <p class="day-close-stat-value">${dayCloseSummary.rounds}</p>
        <p class="day-close-stat-label">Confirmed</p>
      </div>
      <div class="day-close-stat" data-tone="sit">
        <p class="day-close-stat-value">${dayCloseSummary.rise}</p>
        <p class="day-close-stat-label">Desk up</p>
      </div>
      <div class="day-close-stat">
        <p class="day-close-stat-value">${dayCloseSummary.ritual_done}</p>
        <p class="day-close-stat-label">Moments</p>
      </div>
    `
    }
  }

  const skipStand = qs(root, 'btn-skip-standing')
  const skipStandEx = qs(root, 'btn-skip-standing-ex')
  const skipLabel = skipMomentLabel(state.pendingNextPhase)
  setButtonLabel(skipStand, skipLabel)
  setButtonLabel(skipStandEx, skipLabel)

  setHidden(thresholdSkip, !momentChoiceAtThreshold || dayCloseVisible)
  setHidden(btnSnooze, !isThreshold || dayCloseVisible || !canSnoozePostureNow())
  if (momentChoiceAtThreshold) {
    setButtonLabel(thresholdSkip, thresholdSkipLabel(state.pendingNextPhase))
    setButtonLabel(btnRise, thresholdRiseLabel(state.endedPhase))
    btnRise.classList.add('btn-primary')
    btnRise.classList.remove('btn-ghost')
    thresholdSkip.classList.remove('btn-primary')
    thresholdSkip.classList.add('btn-ghost')
  } else if (isThreshold) {
    setButtonLabel(btnRise, thresholdRiseLabel(state.endedPhase))
    btnRise.classList.add('btn-primary')
    btnRise.classList.remove('btn-ghost')
  }

  setText(phaseEl, dayCloseVisible ? 'Day close' : phaseLabel(state.phase))
  setHidden(phaseEl, isThreshold || dayCloseVisible)

  const level =
    isRunning || isExercise || thresholdTimerActive
      ? fillLevel(remainingMs, state.phaseDurationMs)
      : isSetup
        ? 0.85
        : 0.4
  const fillCss = String(level)
  if (shell.style.getPropertyValue('--atmosphere-fill') !== fillCss) {
    shell.style.setProperty('--atmosphere-fill', fillCss)
  }
  const edgeFill = qs(root, 'desk-edge-fill')
  const edgeScale = `scaleX(${isRunning || isExercise ? level : 1})`
  if (edgeFill.style.transform !== edgeScale) {
    edgeFill.style.transform = edgeScale
  }

  // Wait screens: no edge bar under the headline — only shell atmosphere animation.
  setHidden(atmo, isPick || isThreshold || checkInVisible || dayCloseVisible)
  atmo.classList.toggle('is-timed', isRunning || isExercise)
  atmo.classList.toggle('is-bar-only', barOnly)
  setHidden(qs(root, 'btn-atmosphere-label'), barOnly)

  if (isSetup) {
    setText(atmoLabel, '·')
  } else if (isFrozen) {
    setText(atmoLabel, showFreezePrompt ? 'Call over?' : 'Freeze')
  } else if (
    (atmosphereDetail === 'clock' || isReturnOrientationActive()) &&
    (isRunning || isExercise)
  ) {
    setText(atmoLabel, formatExactTime(remainingMs))
  } else if (atmosphereDetail === 'percent' && (isRunning || isExercise)) {
    setText(atmoLabel, formatRemainingPercent(remainingMs, state.phaseDurationMs))
  } else if (isRunning || isExercise) {
    setText(atmoLabel, softTimeLabel(remainingMs, state.phaseDurationMs, approaching))
  } else {
    setText(atmoLabel, '·')
  }

  const muteHint = qs(root, 'mute-hint')
  const compact = shell.dataset.compact === 'true'
  // Ready: settings cue covers discovery — no mute nag on the first screen.
  if (
    !isSetup &&
    !state.soundEnabled &&
    !(compact && isRunning) &&
    !barOnly &&
    !dayCloseVisible
  ) {
    setHidden(muteHint, false)
    setText(
      muteHint,
      state.notificationsEnabled
        ? 'Sound off — signals via color, tab title, and notifications.'
        : 'Sound off — enable notifications in settings.',
    )
  } else {
    setHidden(muteHint, true)
  }

  const ambientMot = MOTIVATIONS.find((m) => m.id === state.ambientMotivationId)
  if (isRunning && ambientMot?.kind === 'north' && !compact && !dayCloseVisible) {
    setHidden(ambient, false)
    setText(ambient, ambientMot.text)
  } else {
    setHidden(ambient, true)
    setText(ambient, '')
  }

  let momentsChanged = false
  if (dayCloseVisible) {
    // hint hidden — story + stats carry the message
  } else if (checkInVisible) {
    setText(
      qs(root, 'check-in-q'),
      state.phase === 'stand' ? 'Still standing?' : 'Still at your desk?',
    )
    setHintText(hint, 'Tap Yes — that counts as confirmed for today.')
  } else if (isSetup) {
    const intervals = resolveIntervals(state.intervals)
    if (state.demo) {
      setHintText(
        hint,
        state.mode === 'lazy'
          ? 'Demo Lazy — full loop in seconds, not a Pomodoro.'
          : 'Demo — full loop in seconds, not a Pomodoro.',
      )
    } else {
      const rhythm = intervalSummary(intervals, state.mode)
      if (state.mode === 'lazy') {
        setHintLines(hint, rhythm, 'Survival mode — move optional at each switch.')
      } else {
        setHintLines(hint, rhythm, 'Body maintenance — not a focus timer.')
      }
    }
  } else if (isThreshold) {
    setHintText(hint, 'The desk is waiting. No pressure.')
    setText(qs(root, 'threshold-lead'), thresholdLead(state.endedPhase))
    setText(qs(root, 'threshold-sub'), thresholdSub(state.endedPhase))
  } else if (isPick) {
    setText(qs(root, 'pick-lead'), pickLead(state.pendingNextPhase))
    setHintText(
      hint,
      `This week: ${weekFocusLabel()} · ${
        state.pendingNextPhase === 'sit'
          ? 'Desk down and a moment — or sit right away.'
          : 'Desk up and a moment — or stand right away.'
      }`,
    )
    momentsChanged = setMomentCards(qs(root, 'moment-cards'), state.momentChoiceIds ?? [])
  } else if (isFrozen) {
    setHintText(
      hint,
      showFreezePrompt
        ? 'Call over? Cooldown or resume now — no stress.'
        : state.demo
          ? 'Freeze on — demo prompt after ~12s.'
          : 'Freeze on — call protection. The desk waits.',
    )
  } else if (isExercise) {
    setHintText(
      hint,
      state.resumeAfterAfterplay
        ? 'Short cooldown after the call.'
        : momentOrderHint(state.pendingNextPhase),
    )
  } else if (approaching) {
    setHintText(hint, 'Soon. The desk will check in — no surprise alarm.')
  } else {
    setHintText(
      hint,
      state.demo ? 'Demo — atmosphere, moment, desk.' : runningPhaseHint(state.mode === 'lazy'),
    )
  }

  setHidden(
    hint,
    isThreshold ||
      dayCloseVisible ||
      (barOnly && (isRunning || isExercise || isFrozen) && !checkInVisible && !dayCloseVisible),
  )

  if (isExercise) {
    const ex = getMoment(state.currentExerciseId)
    const mot = MOTIVATIONS.find((m) => m.id === state.currentMotivationId)
    setText(
      qs(root, 'ritual-kicker'),
      state.resumeAfterAfterplay ? 'Cooldown' : ex ? kindLabel(ex.kind) : 'Moment',
    )
    setText(qs(root, 'exercise-title'), ex?.title ?? 'Moment')
    setText(qs(root, 'exercise-hint'), ex?.prompt ?? '')
    setText(qs(root, 'motivation'), state.resumeAfterAfterplay ? '' : (mot?.text ?? ''))
  }

  if (momentsChanged || state !== lastShortcutHintState) {
    applyShortcutHints(root, state.shortcutHintsEnabled !== false)
    lastShortcutHintState = state
  }
}

import type { AppState } from './state'
import { getMoment, kindLabel, MOMENTS } from './exercises'
import { MOTIVATIONS } from './motivation'
import { confirmCopy, phaseLabel, pickLead, skipMomentLabel, thresholdLead, thresholdRiseLabel, thresholdSkipLabel, thresholdSub } from './modes'
import { fillLevel, formatExactTime, formatRemainingPercent, softTimeLabel } from './atmosphere'
import { intervalSummary, resolveIntervals } from './intervals'
import { appPath } from './paths'
import { isCheckInVisible } from './timer'
import { buildDayStory, type StatsSummary } from './stats'
import { shortcutHintLabel, type ShortcutId } from './shortcuts'

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
  onToggleLazy: () => void
  onToggleClock: () => void
  onToggleAtmosphereWords: () => void
  onInstall: () => void
  onDismissInstall: () => void
  onChooseRise: () => void
  onChooseLazyPath: () => void
  onConfirmDesk: () => void
  onCloseDay: () => void
  onDismissDayClose: () => void
}

type AtmosphereDetail = 'soft' | 'clock' | 'percent'

let atmosphereDetail: AtmosphereDetail = 'soft'
const WORDS_KEY = 'mvn-atmosphere-words-hidden'
let wordsHidden = false
let dayCloseSummary: StatsSummary | null = null
const RETURN_AWAY_MS = 20_000
const RETURN_PULSE_MS = 8_000
let hiddenAt: number | null = null
let returnOrientationUntil = 0

try {
  wordsHidden = localStorage.getItem(WORDS_KEY) === '1'
} catch {
  wordsHidden = false
}

function setButtonLabel(btn: HTMLElement, text: string): void {
  const label = btn.querySelector<HTMLElement>('.btn-text')
  if (label) label.textContent = text
  else btn.textContent = text
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
    if (kbd) {
      kbd.textContent = shortcutHintLabel(id)
      kbd.hidden = !enabled
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
      kbd.textContent = String(index + 1)
      kbd.hidden = false
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

function pulseReturnOrientation(): void {
  returnOrientationUntil = Date.now() + RETURN_PULSE_MS
}

/** After being away, briefly show exact time and highlight status. */
export function bindReturnOrientation(onPulse: () => void): () => void {
  const onVisibility = () => {
    if (document.visibilityState === 'hidden') {
      hiddenAt = Date.now()
      return
    }
    if (hiddenAt != null && Date.now() - hiddenAt >= RETURN_AWAY_MS) {
      pulseReturnOrientation()
      onPulse()
    }
    hiddenAt = null
  }
  document.addEventListener('visibilitychange', onVisibility)
  return () => document.removeEventListener('visibilitychange', onVisibility)
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

export function getAtmosphereDetail(): AtmosphereDetail {
  return atmosphereDetail
}

export function toggleAtmosphereDetail(): void {
  if (wordsHidden) {
    setAtmosphereWordsHidden(false)
    return
  }
  atmosphereDetail =
    atmosphereDetail === 'soft' ? 'clock' : atmosphereDetail === 'clock' ? 'percent' : 'soft'
}

/** @deprecated use toggleAtmosphereDetail */
export function toggleExactClock(): void {
  toggleAtmosphereDetail()
}

export function isAtmosphereWordsHidden(): boolean {
  return wordsHidden
}

export function setAtmosphereWordsHidden(hidden: boolean): void {
  wordsHidden = hidden
  if (hidden) atmosphereDetail = 'soft'
  try {
    localStorage.setItem(WORDS_KEY, hidden ? '1' : '0')
  } catch {
    // session-only
  }
}

export function toggleAtmosphereWords(): void {
  setAtmosphereWordsHidden(!wordsHidden)
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
          <p class="install-title">Als App installieren</p>
          <p class="install-text">Besser für Zweitmonitor, Notifications und einen echten Dauerplatz auf dem Desktop.</p>
        </div>
        <div class="install-actions">
          <button type="button" class="btn btn-primary" id="btn-install">App installieren</button>
          <button type="button" class="install-dismiss" id="btn-install-dismiss">Nicht jetzt</button>
        </div>
      </section>

      <header class="top">
        <div class="top-brand">
          <p class="brand">MVN</p>
          <p class="tag">Minimal Viable Movement</p>
        </div>
        <nav class="top-actions" aria-label="App">
          <button
            type="button"
            class="icon-link"
            id="btn-close-day"
            aria-label="Tagesabschluss"
            title="Tagesabschluss"
          >
            <svg class="icon" viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false">
              <path
                fill="currentColor"
                d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2Zm-1.1 14.5-4.2-4.2 1.4-1.4 2.8 2.8 5.8-5.8 1.4 1.4Z"
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
          <a class="icon-link" href="${appPath('settings.html')}" aria-label="Einstellungen" title="Einstellungen">
            <svg class="icon" viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false">
              <path
                fill="currentColor"
                d="M19.14 12.94c.04-.31.06-.63.06-.94s-.02-.63-.06-.94l2.03-1.58a.5.5 0 0 0 .12-.64l-1.92-3.32a.5.5 0 0 0-.6-.22l-2.39.96a7.03 7.03 0 0 0-1.63-.94l-.36-2.54A.5.5 0 0 0 14.3 2h-4.6a.5.5 0 0 0-.49.42l-.36 2.54c-.58.23-1.12.54-1.63.94l-2.39-.96a.5.5 0 0 0-.6.22L2.31 8.48a.5.5 0 0 0 .12.64L4.46 10.7c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58a.5.5 0 0 0-.12.64l1.92 3.32c.14.24.43.34.68.22l2.39-.96c.5.4 1.05.72 1.63.94l.36 2.54c.05.24.25.42.49.42h4.6c.24 0 .44-.18.49-.42l.36-2.54c.58-.22 1.12-.54 1.63-.94l2.39.96c.25.12.54.02.68-.22l1.92-3.32a.5.5 0 0 0-.12-.64l-2.03-1.58ZM12 15.5A3.5 3.5 0 1 1 12 8.5a3.5 3.5 0 0 1 0 7Z"
              />
            </svg>
          </a>
        </nav>
      </header>

      <div class="content-area">
        <div class="middle">
          <main class="stage">
            <p class="phase-label" id="phase-label">Setup</p>
            <div class="atmosphere" id="atmosphere">
              <button
                type="button"
                class="atmosphere-hit"
                id="btn-atmosphere-label"
                aria-live="polite"
                aria-label="Phase, tippen für Zeit oder Prozent"
              >
                <span class="atmosphere-label" id="atmosphere-label">bereit</span>
              </button>
              <div class="desk-edge-row">
                <button
                  type="button"
                  class="desk-edge"
                  id="btn-desk-edge"
                  aria-label="Fortschritt, Tippen zeigt Text wieder"
                >
                  <span class="desk-edge-fill" id="desk-edge-fill"></span>
                </button>
                <button type="button" class="atmosphere-min" id="btn-atmosphere-min">
                  nur Progress
                </button>
              </div>
            </div>
            <p class="hint" id="hint">Wähle deinen Start — die Hürde bleibt lächerlich niedrig.</p>
            <p class="ambient" id="ambient" hidden></p>
            <p class="mute-hint" id="mute-hint" hidden></p>
          </main>

          <section class="check-in" id="check-in" hidden>
            <p class="check-in-q" id="check-in-q">Noch am Tisch?</p>
            <button type="button" class="btn btn-primary has-kbd" id="btn-check-in" data-shortcut="checkIn">
              <span class="btn-text">Ja</span>
              <span class="btn-kbd" aria-hidden="true">↵</span>
            </button>
          </section>

          <section class="threshold" id="threshold" hidden>
            <p class="threshold-lead" id="threshold-lead">Tisch will hoch.</p>
            <p class="threshold-sub" id="threshold-sub">Kein Zwang. Wähl den Weg, der heute geht.</p>
          </section>

          <section class="confirm" id="confirm" hidden>
            <p class="threshold-lead" id="confirm-lead">Tisch steht?</p>
            <p class="threshold-sub" id="confirm-sub">Bestätigen — oder einfach weiter.</p>
          </section>

          <section class="freeze-prompt" id="freeze-prompt" hidden>
            <p class="freeze-q">Call vorbei?</p>
          </section>

          <section class="pick" id="pick" hidden>
            <p class="pick-lead" id="pick-lead">Kurz bewegen, bevor du hochgehst.</p>
            <div class="moment-list" id="moment-cards"></div>
          </section>

          <section class="exercise" id="exercise" hidden>
            <p class="ritual-kicker" id="ritual-kicker">Moment</p>
            <p class="exercise-title" id="exercise-title"></p>
            <p class="exercise-hint" id="exercise-hint"></p>
            <p class="motivation" id="motivation"></p>
          </section>

          <section class="day-close-reward" id="day-close-reward" hidden>
            <p class="day-close-kicker">Tag beendet</p>
            <p class="day-close-story" id="day-close-story"></p>
            <div class="day-close-stats" id="day-close-stats" aria-label="Tageszahlen"></div>
            <a class="day-close-more" id="day-close-more" href="${appPath('analytics.html')}">Alle Analytics</a>
          </section>

          <nav class="primary-actions" id="primary-actions" aria-label="Aktionen">
            <div class="row day-close-actions" id="day-close-actions" hidden>
              ${actionButton('btn-day-close-done', 'btn btn-primary', 'Weiter', 'dayCloseDone')}
            </div>
            <div class="row setup-actions" id="setup-controls">
              ${actionButton('btn-start', 'btn btn-primary', 'Start', 'start')}
            </div>
            <div class="row run-actions" id="run-controls" hidden>
              ${actionButton('btn-freeze', 'btn btn-danger', 'Freeze', 'freeze')}
              ${actionButton('btn-resume', 'btn btn-primary', 'Weiter', 'resume', true)}
            </div>
            <div class="row threshold-actions" id="threshold-actions" hidden>
              ${actionButton('btn-rise', 'btn btn-primary', 'Kurz bewegen', 'rise')}
              ${actionButton('btn-threshold-skip', 'btn btn-ghost', 'Einfach setzen', 'skipStanding')}
              <div class="row threshold-secondary">
                ${actionButton('btn-lazy-path', 'btn btn-ghost', 'Lazy weiter', 'lazyPath')}
              </div>
            </div>
            <div class="row pick-actions" id="pick-actions" hidden>
              ${actionButton('btn-skip-standing', 'btn btn-primary', 'Heute reicht Stehen', 'skipStanding')}
            </div>
            <div class="row confirm-actions" id="confirm-actions" hidden>
              ${actionButton('btn-confirm-desk', 'btn btn-primary', 'Tisch steht', 'confirmDesk')}
            </div>
            <div class="row freeze-actions" id="freeze-actions" hidden>
              ${actionButton('btn-afterplay', 'btn btn-primary', 'Call-Nachspiel', 'afterplay')}
              ${actionButton('btn-call-done', 'btn btn-ghost', 'Sofort weiter', 'resume')}
              ${actionButton('btn-extend', 'btn btn-ghost', 'Noch 15 Min', 'extendFreeze')}
            </div>
            <div class="row exercise-actions" id="exercise-actions" hidden>
              ${actionButton('btn-done-moment', 'btn btn-primary', 'Erledigt', 'doneMoment')}
              ${actionButton('btn-reroll', 'btn btn-ghost', 'Anderer Moment', 'reroll')}
              ${actionButton('btn-skip-standing-ex', 'btn btn-ghost', 'Heute reicht Stehen', 'skipStanding')}
            </div>
            <div class="row quick-actions" id="quick-actions">
              ${actionButton('btn-lazy', 'btn btn-ghost', 'Lazy Mode', 'toggleLazy')}
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
  qs(root, 'btn-atmosphere-label').addEventListener('click', handlers.onToggleClock)
  qs(root, 'btn-desk-edge').addEventListener('click', () => {
    if (wordsHidden) handlers.onToggleAtmosphereWords()
    else handlers.onToggleClock()
  })
  qs(root, 'btn-atmosphere-min').addEventListener('click', handlers.onToggleAtmosphereWords)
  qs(root, 'btn-install').addEventListener('click', handlers.onInstall)
  qs(root, 'btn-install-dismiss').addEventListener('click', handlers.onDismissInstall)
  qs(root, 'btn-rise').addEventListener('click', handlers.onChooseRise)
  qs(root, 'btn-lazy-path').addEventListener('click', handlers.onChooseLazyPath)
  qs(root, 'btn-confirm-desk').addEventListener('click', handlers.onConfirmDesk)
  qs(root, 'btn-day-close-done').addEventListener('click', handlers.onDismissDayClose)

  qs(root, 'moment-cards').addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-moment-id]')
    if (!btn?.dataset.momentId) return
    handlers.onChooseMoment(btn.dataset.momentId)
  })
}

export function setInstallVisible(root: HTMLElement, visible: boolean): void {
  const banner = qs<HTMLElement>(root, 'install-banner')
  if (!banner) return
  banner.hidden = !visible
}

const COMPACT_HEIGHT_MQ = '(max-height: 900px)'

export function updateCompactMode(root: HTMLElement): void {
  const shell = root.querySelector('.shell') as HTMLElement | null
  if (!shell) return
  shell.dataset.compact = window.matchMedia(COMPACT_HEIGHT_MQ).matches ? 'true' : 'false'
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
  const isConfirm = state.phase === 'confirm'
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
  const confirmTimerActive = isConfirm && state.phaseEndsAt != null
  const waitTimerActive = thresholdTimerActive || confirmTimerActive

  shell.dataset.phase = state.phase
  shell.dataset.mode = state.mode
  shell.dataset.demo = state.demo ? 'true' : 'false'
  shell.dataset.approaching = approaching ? 'true' : 'false'
  shell.dataset.muted = state.soundEnabled ? 'false' : 'true'
  shell.dataset.started = isSetup ? 'false' : 'true'
  shell.dataset.atmosphereDetail = atmosphereDetail
  shell.dataset.wordsHidden = wordsHidden ? 'true' : 'false'
  shell.dataset.dayClose = dayCloseVisible ? 'true' : 'false'
  shell.dataset.returning = isReturnOrientationActive() ? 'true' : 'false'
  shell.dataset.thresholdTimer = waitTimerActive ? 'true' : 'false'
  if (waitTimerActive && state.pendingNextPhase) {
    shell.dataset.pendingNext = state.pendingNextPhase
  } else {
    delete shell.dataset.pendingNext
  }
  updateCompactMode(root)

  const phaseEl = qs(root, 'phase-label')
  const atmo = qs(root, 'atmosphere')
  const atmoLabel = qs(root, 'atmosphere-label')
  const atmoMin = qs(root, 'btn-atmosphere-min')
  const hint = qs(root, 'hint')
  const ambient = qs(root, 'ambient')
  const threshold = qs(root, 'threshold')
  const exercise = qs(root, 'exercise')
  const confirm = qs(root, 'confirm')
  const freezePrompt = qs(root, 'freeze-prompt')
  const pick = qs(root, 'pick')
  const checkIn = qs(root, 'check-in')
  const setupControls = qs(root, 'setup-controls')
  const runControls = qs(root, 'run-controls')
  const btnFreeze = qs<HTMLButtonElement>(root, 'btn-freeze')
  const btnResume = qs<HTMLButtonElement>(root, 'btn-resume')
  const btnRise = qs<HTMLButtonElement>(root, 'btn-rise')
  const thresholdSkip = qs<HTMLButtonElement>(root, 'btn-threshold-skip')
  const btnReroll = qs<HTMLButtonElement>(root, 'btn-reroll')
  const thresholdActions = qs(root, 'threshold-actions')
  const pickActions = qs(root, 'pick-actions')
  const confirmActions = qs(root, 'confirm-actions')
  const freezeActions = qs(root, 'freeze-actions')
  const exerciseActions = qs(root, 'exercise-actions')
  const dayCloseReward = qs(root, 'day-close-reward')
  const dayCloseActions = qs(root, 'day-close-actions')
  const btnLazy = qs(root, 'btn-lazy')

  setupControls.hidden = !isSetup || dayCloseVisible
  runControls.hidden =
    isSetup || isThreshold || isConfirm || isExercise || isPick || checkInVisible || dayCloseVisible
  thresholdActions.hidden = !isThreshold || dayCloseVisible
  pickActions.hidden = !isPick || dayCloseVisible
  confirmActions.hidden = !isConfirm || dayCloseVisible
  freezeActions.hidden = !(isFrozen && showFreezePrompt) || dayCloseVisible
  exerciseActions.hidden = !isExercise || dayCloseVisible
  dayCloseActions.hidden = !dayCloseVisible
  btnFreeze.hidden = isFrozen || isThreshold || isConfirm || isExercise || isPick || dayCloseVisible
  btnResume.hidden = !isFrozen || showFreezePrompt || dayCloseVisible
  freezePrompt.hidden = !(isFrozen && showFreezePrompt) || dayCloseVisible
  exercise.hidden = !isExercise || dayCloseVisible
  threshold.hidden = !isThreshold || dayCloseVisible
  confirm.hidden = !isConfirm || dayCloseVisible
  pick.hidden = !isPick || dayCloseVisible
  checkIn.hidden = !checkInVisible || dayCloseVisible
  dayCloseReward.hidden = !dayCloseVisible

  btnLazy.hidden = isThreshold || isConfirm || isExercise || isPick || dayCloseVisible
  setButtonLabel(btnLazy, state.mode === 'lazy' ? 'Lazy an' : 'Lazy Mode')
  btnLazy.classList.toggle('is-on', state.mode === 'lazy')
  btnReroll.hidden = state.momentRerolled

  if (dayCloseVisible && dayCloseSummary) {
    qs(root, 'day-close-story').textContent = buildDayStory(dayCloseSummary)
    const open = Math.max(0, dayCloseSummary.rise - dayCloseSummary.rounds)
    qs(root, 'day-close-stats').innerHTML = `
      <div class="day-close-stat" data-tone="stand">
        <p class="day-close-stat-value">${dayCloseSummary.rounds}</p>
        <p class="day-close-stat-label">Bestätigt</p>
      </div>
      <div class="day-close-stat">
        <p class="day-close-stat-value">${open}</p>
        <p class="day-close-stat-label">Ohne Beweis</p>
      </div>
      <div class="day-close-stat">
        <p class="day-close-stat-value">${dayCloseSummary.ritual_skip}</p>
        <p class="day-close-stat-label">Ohne Bewegung</p>
      </div>
    `
  }

  const skipStand = qs(root, 'btn-skip-standing')
  const skipStandEx = qs(root, 'btn-skip-standing-ex')
  const skipLabel = skipMomentLabel(state.pendingNextPhase)
  setButtonLabel(skipStand, skipLabel)
  setButtonLabel(skipStandEx, skipLabel)

  thresholdSkip.hidden = !momentChoiceAtThreshold || dayCloseVisible
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

  phaseEl.textContent = dayCloseVisible ? 'Tagesabschluss' : phaseLabel(state.phase)
  phaseEl.hidden = isConfirm || isThreshold || dayCloseVisible

  const level =
    isRunning || isExercise || waitTimerActive
      ? fillLevel(remainingMs, state.phaseDurationMs)
      : isSetup
        ? 0.85
        : 0.4
  shell.style.setProperty('--atmosphere-fill', String(level))
  const edgeFill = qs(root, 'desk-edge-fill')
  edgeFill.style.transform = `scaleX(${isRunning || isExercise ? level : 1})`

  // Wait screens: no edge bar under the headline — only shell atmosphere animation.
  atmo.hidden =
    isPick ||
    isThreshold ||
    isConfirm ||
    checkInVisible ||
    dayCloseVisible
  atmo.classList.toggle('is-timed', isRunning || isExercise)
  atmo.classList.toggle('is-words-hidden', wordsHidden)
  qs(root, 'btn-atmosphere-label').hidden = wordsHidden
  atmoMin.hidden = false
  atmoMin.textContent = wordsHidden ? 'Text an' : 'nur Progress'
  atmoMin.setAttribute('aria-pressed', wordsHidden ? 'true' : 'false')

  if (isSetup) {
    atmoLabel.textContent = 'bereit'
  } else if (isFrozen) {
    atmoLabel.textContent = showFreezePrompt ? 'Call vorbei?' : 'Freeze'
  } else if (
    (atmosphereDetail === 'clock' || isReturnOrientationActive()) &&
    (isRunning || isExercise)
  ) {
    atmoLabel.textContent = formatExactTime(remainingMs)
  } else if (atmosphereDetail === 'percent' && (isRunning || isExercise)) {
    atmoLabel.textContent = formatRemainingPercent(remainingMs, state.phaseDurationMs)
  } else if (isRunning || isExercise) {
    atmoLabel.textContent = softTimeLabel(remainingMs, state.phaseDurationMs, approaching)
  } else {
    atmoLabel.textContent = '·'
  }

  const muteHint = qs(root, 'mute-hint')
  const compact = shell.dataset.compact === 'true'
  if (!state.soundEnabled && !(compact && isRunning) && !wordsHidden && !dayCloseVisible) {
    muteHint.hidden = false
    muteHint.textContent = state.notificationsEnabled
      ? 'Ton aus — Signale über Farbe, Tab-Titel und Notifications.'
      : 'Ton aus — in Einstellungen Notifications aktivieren.'
  } else {
    muteHint.hidden = true
  }

  const ambientMot = MOTIVATIONS.find((m) => m.id === state.ambientMotivationId)
  if (isRunning && ambientMot?.kind === 'north' && !compact && !dayCloseVisible) {
    ambient.hidden = false
    ambient.textContent = ambientMot.text
  } else {
    ambient.hidden = true
    ambient.textContent = ''
  }

  if (dayCloseVisible) {
    // hint hidden — story + stats carry the message
  } else if (checkInVisible) {
    qs(root, 'check-in-q').textContent =
      state.phase === 'stand' ? 'Noch am Stehen?' : 'Noch am Tisch?'
    hint.textContent = 'Kurzer Check — kein Alarm. Ein Tap reicht.'
  } else if (isSetup) {
    const intervals = resolveIntervals(state.intervals)
    if (state.demo) {
      hint.textContent =
        state.mode === 'lazy' ? 'Demo Lazy — Kurzzeiten zum Testen.' : 'Demo aktiv — Kurzzeiten zum Testen.'
    } else {
      hint.textContent =
        state.mode === 'lazy'
          ? `${intervalSummary(intervals, 'lazy')} · Überlebensmodus.`
          : intervalSummary(intervals, 'high')
    }
  } else if (isThreshold) {
    hint.textContent = 'Der Tisch wartet. Kein Zwang.'
    qs(root, 'threshold-lead').textContent = thresholdLead(state.endedPhase)
    qs(root, 'threshold-sub').textContent = thresholdSub(state.endedPhase)
  } else if (isPick) {
    qs(root, 'pick-lead').textContent = pickLead(state.pendingNextPhase)
    hint.textContent =
      state.pendingNextPhase === 'sit'
        ? 'Tippen — oder direkt setzen.'
        : 'Tippen — oder einfach stehen.'
    const cards = qs(root, 'moment-cards')
    const ids = state.momentChoiceIds ?? []
    cards.innerHTML = ids
      .map((id) => {
        const m = getMoment(id) ?? MOMENTS[0]!
        return `<button type="button" class="moment-choice" data-moment-id="${m.id}">
          <span class="moment-kind">${kindLabel(m.kind)}</span>
          <span class="moment-title">${m.title}</span>
        </button>`
      })
      .join('')
  } else if (isFrozen) {
    hint.textContent = showFreezePrompt
      ? 'Call vorbei? Nachspiel oder sofort weiter — kein Stress.'
      : state.demo
        ? 'Freeze aktiv — Demo-Prompt nach ~12s.'
        : 'Freeze aktiv — Call-Schutz. Der Tisch wartet.'
  } else if (isExercise) {
    hint.textContent = state.resumeAfterAfterplay
      ? 'Kurzes Nachspiel nach dem Call.'
      : 'Kurz. Erledigt, wenn du fertig bist.'
  } else if (approaching) {
    hint.textContent = 'Gleich. Der Tisch meldet sich — kein Überraschungsalarm.'
  } else {
    hint.textContent = state.demo
      ? 'Demo — Atmosphäre, Moment, Tisch.'
      : state.mode === 'lazy'
        ? 'Lazy Mode — die Hürde bleibt unten.'
        : 'Der Tisch hält den Rhythmus. Du entscheidest die Wechsel.'
  }

  if (isConfirm) {
    const copy = confirmCopy(state.endedPhase)
    qs(root, 'confirm-lead').textContent = copy.lead
    qs(root, 'confirm-sub').textContent = copy.sub
    setButtonLabel(qs(root, 'btn-confirm-desk'), copy.yes)
  }

  if (
    isConfirm ||
    isThreshold ||
    dayCloseVisible ||
    (wordsHidden && (isRunning || isExercise || isFrozen) && !checkInVisible && !dayCloseVisible)
  ) {
    hint.hidden = true
  } else {
    hint.hidden = false
  }

  if (isExercise) {
    const ex = getMoment(state.currentExerciseId)
    const mot = MOTIVATIONS.find((m) => m.id === state.currentMotivationId)
    qs(root, 'ritual-kicker').textContent = state.resumeAfterAfterplay
      ? 'Nachspiel'
      : ex
        ? kindLabel(ex.kind)
        : 'Moment'
    qs(root, 'exercise-title').textContent = ex?.title ?? 'Moment'
    qs(root, 'exercise-hint').textContent = ex?.prompt ?? ''
    qs(root, 'motivation').textContent = state.resumeAfterAfterplay ? '' : (mot?.text ?? '')
  }

  applyShortcutHints(root, state.shortcutHintsEnabled !== false)
}

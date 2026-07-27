import type { AppState } from './state'
import { getMoment, kindLabel, MOMENTS } from './exercises'
import { MOTIVATIONS } from './motivation'
import { confirmCopy, nextPhaseVerb, phaseLabel, thresholdLead, thresholdSub } from './modes'
import { fillLevel, formatExactTime, softTimeLabel } from './atmosphere'
import { intervalSummary, resolveIntervals } from './intervals'
import { appPath } from './paths'
import { isCheckInVisible } from './timer'
import { buildDayCloseLine, buildDayStory, type StatsSummary } from './stats'

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
  onChooseFreezePath: () => void
  onConfirmDesk: () => void
  onConfirmDeskLater: () => void
  onCloseDay: () => void
  onDismissDayClose: () => void
}

let showExactClock = false
const WORDS_KEY = 'mvn-atmosphere-words-hidden'
let wordsHidden = false
let dayCloseSummary: StatsSummary | null = null

try {
  wordsHidden = localStorage.getItem(WORDS_KEY) === '1'
} catch {
  wordsHidden = false
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

export function getShowExactClock(): boolean {
  return showExactClock
}

export function toggleExactClock(): void {
  if (wordsHidden) {
    setAtmosphereWordsHidden(false)
    return
  }
  showExactClock = !showExactClock
}

export function isAtmosphereWordsHidden(): boolean {
  return wordsHidden
}

export function setAtmosphereWordsHidden(hidden: boolean): void {
  wordsHidden = hidden
  if (hidden) showExactClock = false
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
                aria-label="Phase, Tippen für genaue Zeit"
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
            <button type="button" class="btn btn-primary" id="btn-check-in">Ja</button>
          </section>

          <section class="threshold" id="threshold" hidden>
            <p class="threshold-lead" id="threshold-lead">Tisch will hoch.</p>
            <p class="threshold-sub" id="threshold-sub">Kein Zwang. Wähl den Weg, der heute geht.</p>
          </section>

          <section class="confirm" id="confirm" hidden>
            <p class="threshold-lead" id="confirm-lead">Tisch steht?</p>
            <p class="threshold-sub" id="confirm-sub">Ohne Bestätigung zählt die Runde nicht als echt. Ein Tap reicht.</p>
          </section>

          <section class="freeze-prompt" id="freeze-prompt" hidden>
            <p class="freeze-q">Call vorbei?</p>
          </section>

          <section class="pick" id="pick" hidden>
            <p class="pick-lead">Ein Moment. Oder nur stehen.</p>
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
            <p class="day-close-line" id="day-close-line"></p>
            <div class="day-close-stats" id="day-close-stats" aria-label="Tageszahlen"></div>
            <a class="day-close-more" id="day-close-more" href="${appPath('analytics.html')}">Alle Analytics</a>
          </section>

          <nav class="primary-actions" id="primary-actions" aria-label="Aktionen">
            <div class="row day-close-actions" id="day-close-actions" hidden>
              <button type="button" class="btn btn-primary" id="btn-day-close-done">Weiter</button>
            </div>
            <div class="row setup-actions" id="setup-controls">
              <button type="button" class="btn btn-primary" id="btn-start">Start</button>
            </div>
            <div class="row run-actions" id="run-controls" hidden>
              <button type="button" class="btn btn-danger" id="btn-freeze">Freeze</button>
              <button type="button" class="btn btn-primary" id="btn-resume" hidden>Weiter</button>
            </div>
            <div class="row threshold-actions" id="threshold-actions" hidden>
              <button type="button" class="btn btn-primary" id="btn-rise">Tisch hoch</button>
              <div class="row threshold-secondary">
                <button type="button" class="btn btn-ghost" id="btn-lazy-path">Lazy weiter</button>
                <button type="button" class="btn btn-danger" id="btn-freeze-path">Freeze</button>
              </div>
            </div>
            <div class="row pick-actions" id="pick-actions" hidden>
              <button type="button" class="btn btn-primary" id="btn-skip-standing">Heute reicht Stehen</button>
              <button type="button" class="btn btn-danger" id="btn-freeze-pick">Freeze</button>
            </div>
            <div class="row confirm-actions" id="confirm-actions" hidden>
              <button type="button" class="btn btn-primary" id="btn-confirm-desk">Tisch steht</button>
              <button type="button" class="btn btn-ghost" id="btn-confirm-later">Später</button>
            </div>
            <div class="row freeze-actions" id="freeze-actions" hidden>
              <button type="button" class="btn btn-primary" id="btn-afterplay">Call-Nachspiel</button>
              <button type="button" class="btn btn-ghost" id="btn-call-done">Sofort weiter</button>
              <button type="button" class="btn btn-ghost" id="btn-extend">Noch 15 Min</button>
            </div>
            <div class="row exercise-actions" id="exercise-actions" hidden>
              <button type="button" class="btn btn-primary" id="btn-done-moment">Erledigt</button>
              <button type="button" class="btn btn-ghost" id="btn-reroll">Anderer Moment</button>
              <button type="button" class="btn btn-ghost" id="btn-skip-standing-ex">Heute reicht Stehen</button>
            </div>
            <div class="row quick-actions" id="quick-actions">
              <button type="button" class="btn btn-ghost" id="btn-lazy">Lazy Mode</button>
            </div>
          </nav>
        </div>
      </div>
      </div>
    </div>
  `

  qs(root, 'btn-start').addEventListener('click', handlers.onStart)
  qs(root, 'btn-freeze').addEventListener('click', handlers.onFreeze)
  qs(root, 'btn-freeze-pick').addEventListener('click', handlers.onFreeze)
  qs(root, 'btn-resume').addEventListener('click', handlers.onResume)
  qs(root, 'btn-call-done').addEventListener('click', handlers.onResume)
  qs(root, 'btn-afterplay').addEventListener('click', handlers.onAfterplay)
  qs(root, 'btn-extend').addEventListener('click', handlers.onExtendFreeze)
  qs(root, 'btn-skip-standing').addEventListener('click', handlers.onSkipStanding)
  qs(root, 'btn-skip-standing-ex').addEventListener('click', handlers.onSkipStanding)
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
  qs(root, 'btn-freeze-path').addEventListener('click', handlers.onChooseFreezePath)
  qs(root, 'btn-confirm-desk').addEventListener('click', handlers.onConfirmDesk)
  qs(root, 'btn-confirm-later').addEventListener('click', handlers.onConfirmDeskLater)
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

  shell.dataset.phase = state.phase
  shell.dataset.mode = state.mode
  shell.dataset.demo = state.demo ? 'true' : 'false'
  shell.dataset.approaching = approaching ? 'true' : 'false'
  shell.dataset.muted = state.soundEnabled ? 'false' : 'true'
  shell.dataset.started = isSetup ? 'false' : 'true'
  shell.dataset.showClock = showExactClock ? 'true' : 'false'
  shell.dataset.wordsHidden = wordsHidden ? 'true' : 'false'
  shell.dataset.dayClose = dayCloseVisible ? 'true' : 'false'
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
  const btnRise = qs(root, 'btn-rise')
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
  btnLazy.textContent = state.mode === 'lazy' ? 'Lazy an' : 'Lazy Mode'
  btnLazy.classList.toggle('is-on', state.mode === 'lazy')
  btnReroll.hidden = state.momentRerolled

  if (dayCloseVisible && dayCloseSummary) {
    qs(root, 'day-close-story').textContent = buildDayStory(dayCloseSummary)
    qs(root, 'day-close-line').textContent = buildDayCloseLine(dayCloseSummary)
    qs(root, 'day-close-stats').innerHTML = `
      <div class="day-close-stat" data-tone="stand">
        <p class="day-close-stat-value">${dayCloseSummary.rounds}</p>
        <p class="day-close-stat-label">Tisch bestätigt</p>
      </div>
      <div class="day-close-stat" data-tone="sit">
        <p class="day-close-stat-value">${dayCloseSummary.rise}</p>
        <p class="day-close-stat-label">Tisch hoch</p>
      </div>
      <div class="day-close-stat">
        <p class="day-close-stat-value">${dayCloseSummary.ritual_done}</p>
        <p class="day-close-stat-label">Momente</p>
      </div>
      <div class="day-close-stat" data-tone="freeze">
        <p class="day-close-stat-value">${dayCloseSummary.freeze_total}</p>
        <p class="day-close-stat-label">Freeze</p>
      </div>
    `
  }

  const skipStand = qs(root, 'btn-skip-standing')
  const skipStandEx = qs(root, 'btn-skip-standing-ex')
  const skipLabel =
    state.pendingNextPhase === 'stand' ? 'Heute reicht Stehen' : 'Ohne Moment weiter'
  skipStand.textContent = skipLabel
  skipStandEx.textContent = skipLabel

  phaseEl.textContent = dayCloseVisible ? 'Tagesabschluss' : phaseLabel(state.phase)

  const level = isRunning || isExercise ? fillLevel(remainingMs, state.phaseDurationMs) : isSetup ? 0.85 : 0.4
  shell.style.setProperty('--atmosphere-fill', String(level))
  const edgeFill = qs(root, 'desk-edge-fill')
  edgeFill.style.transform = `scaleX(${level})`
  atmo.hidden = isPick || isThreshold || isConfirm || checkInVisible || dayCloseVisible
  atmo.classList.toggle('is-timed', isRunning || isExercise)
  atmo.classList.toggle('is-words-hidden', wordsHidden)
  qs(root, 'btn-atmosphere-label').hidden = wordsHidden
  atmoMin.textContent = wordsHidden ? 'Text an' : 'nur Progress'
  atmoMin.setAttribute('aria-pressed', wordsHidden ? 'true' : 'false')

  if (isSetup) {
    atmoLabel.textContent = 'bereit'
  } else if (isFrozen) {
    atmoLabel.textContent = showFreezePrompt ? 'Call vorbei?' : 'Freeze'
  } else if (showExactClock && (isRunning || isExercise)) {
    atmoLabel.textContent = formatExactTime(remainingMs)
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

  if (state.endedPhase) {
    btnRise.textContent = nextPhaseVerb(state.endedPhase)
  } else {
    btnRise.textContent = 'Tisch hoch'
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
    hint.textContent = 'Kurzer Blick auf den Tag — der Tisch hat mitgehalten.'
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
    hint.textContent = 'Tippen — oder einfach stehen.'
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
  } else if (isConfirm) {
    const copy = confirmCopy(state.endedPhase)
    qs(root, 'confirm-lead').textContent = copy.lead
    qs(root, 'confirm-sub').textContent = copy.sub
    hint.textContent = 'Ein Tap reicht. (Du kannst auch später bestätigen.)'
  } else {
    hint.textContent = state.demo
      ? 'Demo — Atmosphäre, Moment, Tisch.'
      : state.mode === 'lazy'
        ? 'Lazy Mode — die Hürde bleibt unten.'
        : 'Der Tisch hält den Rhythmus. Du entscheidest die Wechsel.'
  }

  if (wordsHidden && (isRunning || isExercise || isFrozen) && !checkInVisible && !dayCloseVisible) {
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
}

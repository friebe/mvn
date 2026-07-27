import type { AppState } from './state'
import { EXERCISES } from './exercises'
import { MOTIVATIONS } from './motivation'
import { confirmCopy, nextPhaseVerb, phaseLabel } from './modes'
import { intervalSummary, resolveIntervals } from './intervals'
import { appPath } from './paths'
import { formatTime } from './timer'

export interface UiHandlers {
  onStart: () => void
  onFreeze: () => void
  onResume: () => void
  onExtendFreeze: () => void
  onSkip: () => void
  onToggleLazy: () => void
  onInstall: () => void
  onDismissInstall: () => void
  onChooseRise: () => void
  onChooseLazyPath: () => void
  onChooseFreezePath: () => void
  onConfirmDesk: () => void
  onConfirmDeskLater: () => void
}

function qs<T extends HTMLElement>(root: HTMLElement, id: string): T {
  return root.querySelector(`#${id}`) as T
}

export function mountUi(root: HTMLElement, handlers: UiHandlers): void {
  root.innerHTML = `
    <div class="shell" data-phase="setup">
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
        <a class="settings-link" href="${appPath('settings.html')}">Einstellungen</a>
      </header>

      <div class="content-area">
        <main class="stage">
          <p class="phase-label" id="phase-label">Setup</p>
          <p class="countdown" id="countdown" aria-live="polite">--:--</p>
          <p class="hint" id="hint">Wähle deinen Start — die Hürde bleibt lächerlich niedrig.</p>
          <p class="ambient" id="ambient" hidden></p>
          <p class="mute-hint" id="mute-hint" hidden></p>
        </main>

        <section class="threshold" id="threshold" hidden>
          <p class="threshold-lead" id="threshold-lead">Zeit für den Wechsel.</p>
          <p class="threshold-sub">Du musst nichts beweisen. Wähl den Weg, der heute geht.</p>
        </section>

        <section class="confirm" id="confirm" hidden>
          <p class="threshold-lead" id="confirm-lead">Tisch steht?</p>
          <p class="threshold-sub" id="confirm-sub">Ohne Bestätigung zählt die Runde nicht als echt. Ein Tap reicht.</p>
        </section>

        <section class="freeze-prompt" id="freeze-prompt" hidden>
          <p class="freeze-q">Call vorbei?</p>
        </section>

        <nav class="primary-actions" id="primary-actions" aria-label="Aktionen">
          <div class="row setup-actions" id="setup-controls">
            <button type="button" class="btn btn-primary" id="btn-start">Start</button>
          </div>
          <div class="row run-actions" id="run-controls" hidden>
            <button type="button" class="btn btn-danger" id="btn-freeze">Freeze</button>
            <button type="button" class="btn btn-primary" id="btn-resume" hidden>Weiter</button>
          </div>
          <div class="row threshold-actions" id="threshold-actions" hidden>
            <button type="button" class="btn btn-primary" id="btn-rise">Hochfahren</button>
            <button type="button" class="btn btn-ghost" id="btn-lazy-path">Lazy weiter</button>
            <button type="button" class="btn btn-danger" id="btn-freeze-path">Freeze</button>
          </div>
          <div class="row confirm-actions" id="confirm-actions" hidden>
            <button type="button" class="btn btn-primary" id="btn-confirm-desk">Erledigt</button>
            <button type="button" class="btn btn-ghost" id="btn-confirm-later">Später</button>
          </div>
          <div class="row freeze-actions" id="freeze-actions" hidden>
            <button type="button" class="btn btn-primary" id="btn-call-done">Weiter</button>
            <button type="button" class="btn btn-ghost" id="btn-extend">Noch 15 Min</button>
          </div>
          <div class="row exercise-actions" id="exercise-actions" hidden>
            <button type="button" class="btn btn-ghost" id="btn-skip">Skip</button>
          </div>
          <div class="row quick-actions" id="quick-actions">
            <button type="button" class="btn btn-ghost" id="btn-lazy">Lazy Mode</button>
            <a class="btn btn-ghost" id="link-analytics" href="${appPath('analytics.html')}">Analytics</a>
          </div>
        </nav>

        <section class="exercise" id="exercise" hidden>
          <p class="ritual-kicker">Ritual</p>
          <p class="exercise-title" id="exercise-title"></p>
          <p class="exercise-hint" id="exercise-hint"></p>
          <p class="motivation" id="motivation"></p>
        </section>
      </div>
    </div>
  `

  qs(root, 'btn-start').addEventListener('click', handlers.onStart)
  qs(root, 'btn-freeze').addEventListener('click', handlers.onFreeze)
  qs(root, 'btn-resume').addEventListener('click', handlers.onResume)
  qs(root, 'btn-call-done').addEventListener('click', handlers.onResume)
  qs(root, 'btn-extend').addEventListener('click', handlers.onExtendFreeze)
  qs(root, 'btn-skip').addEventListener('click', handlers.onSkip)
  qs(root, 'btn-lazy').addEventListener('click', handlers.onToggleLazy)
  qs(root, 'btn-install').addEventListener('click', handlers.onInstall)
  qs(root, 'btn-install-dismiss').addEventListener('click', handlers.onDismissInstall)
  qs(root, 'btn-rise').addEventListener('click', handlers.onChooseRise)
  qs(root, 'btn-lazy-path').addEventListener('click', handlers.onChooseLazyPath)
  qs(root, 'btn-freeze-path').addEventListener('click', handlers.onChooseFreezePath)
  qs(root, 'btn-confirm-desk').addEventListener('click', handlers.onConfirmDesk)
  qs(root, 'btn-confirm-later').addEventListener('click', handlers.onConfirmDeskLater)
}

export function setInstallVisible(root: HTMLElement, visible: boolean): void {
  const banner = qs<HTMLElement>(root, 'install-banner')
  if (!banner) return
  banner.hidden = !visible
}

const COMPACT_HEIGHT_MQ = '(max-height: 760px)'

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
  const isThreshold = state.phase === 'threshold'
  const isRunning =
    state.phase === 'sit' || state.phase === 'stand' || state.phase === 'reset'

  shell.dataset.phase = state.phase
  shell.dataset.mode = state.mode
  shell.dataset.demo = state.demo ? 'true' : 'false'
  shell.dataset.approaching = approaching ? 'true' : 'false'
  shell.dataset.muted = state.soundEnabled ? 'false' : 'true'
  shell.dataset.started = isSetup ? 'false' : 'true'
  updateCompactMode(root)

  const phaseEl = qs(root, 'phase-label')
  const countdown = qs(root, 'countdown')
  const hint = qs(root, 'hint')
  const ambient = qs(root, 'ambient')
  const threshold = qs(root, 'threshold')
  const exercise = qs(root, 'exercise')
  const confirm = qs(root, 'confirm')
  const freezePrompt = qs(root, 'freeze-prompt')
  const setupControls = qs(root, 'setup-controls')
  const runControls = qs(root, 'run-controls')
  const btnFreeze = qs<HTMLButtonElement>(root, 'btn-freeze')
  const btnResume = qs<HTMLButtonElement>(root, 'btn-resume')
  const btnRise = qs(root, 'btn-rise')
  const thresholdActions = qs(root, 'threshold-actions')
  const confirmActions = qs(root, 'confirm-actions')
  const freezeActions = qs(root, 'freeze-actions')
  const exerciseActions = qs(root, 'exercise-actions')
  const btnLazy = qs(root, 'btn-lazy')

  setupControls.hidden = !isSetup
  runControls.hidden = isSetup || isThreshold || isConfirm || isExercise
  thresholdActions.hidden = !isThreshold
  confirmActions.hidden = !isConfirm
  freezeActions.hidden = !(isFrozen && showFreezePrompt)
  exerciseActions.hidden = !isExercise
  btnFreeze.hidden = isFrozen || isThreshold || isConfirm || isExercise
  btnResume.hidden = !isFrozen
  freezePrompt.hidden = !(isFrozen && showFreezePrompt)
  exercise.hidden = !isExercise
  threshold.hidden = !isThreshold
  confirm.hidden = !isConfirm

  btnLazy.hidden = isThreshold || isConfirm || isExercise
  btnLazy.textContent = state.mode === 'lazy' ? 'Lazy an' : 'Lazy Mode'
  btnLazy.classList.toggle('is-on', state.mode === 'lazy')

  phaseEl.textContent = phaseLabel(state.phase)

  if (isSetup) {
    countdown.textContent = '--:--'
  } else if (isThreshold) {
    countdown.textContent = '···'
  } else if (isFrozen && state.resumeToThreshold) {
    countdown.textContent = '···'
  } else if (isConfirm) {
    countdown.textContent = '--:--'
  } else {
    countdown.textContent = formatTime(remainingMs)
  }

  const muteHint = qs(root, 'mute-hint')
  const compact = shell.dataset.compact === 'true'
  if (!state.soundEnabled && !(compact && isRunning)) {
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
    btnRise.textContent = 'Hochfahren'
  }

  const ambientMot = MOTIVATIONS.find((m) => m.id === state.ambientMotivationId)
  if (isRunning && ambientMot && !(compact && isRunning)) {
    ambient.hidden = false
    ambient.textContent = ambientMot.text
  } else {
    ambient.hidden = true
    ambient.textContent = ''
  }

  if (isSetup) {
    const intervals = resolveIntervals(state.intervals)
    if (state.demo) {
      hint.textContent =
        state.mode === 'lazy'
          ? 'Demo Lazy — Kurzzeiten zum Testen.'
          : 'Demo aktiv — Kurzzeiten zum Testen.'
    } else {
      hint.textContent =
        state.mode === 'lazy'
          ? `${intervalSummary(intervals, 'lazy')} · Überlebensmodus.`
          : intervalSummary(intervals, 'high')
    }
  } else if (isThreshold) {
    hint.textContent = 'Die App wartet. Kein Zwang — drei Türen.'
    qs(root, 'threshold-lead').textContent =
      state.endedPhase === 'sit'
        ? 'Sitzphase vorbei. Was jetzt?'
        : state.endedPhase === 'stand'
          ? 'Stehphase vorbei. Was jetzt?'
          : 'Reset vorbei. Nächste Runde?'
  } else if (isFrozen) {
    hint.textContent = showFreezePrompt
      ? 'Timer pausiert. Kein Stress wegen verpasster Intervalle.'
      : state.demo
        ? 'Freeze aktiv — Demo-Prompt nach ~12s.'
        : 'Freeze aktiv — Call-Schutz läuft.'
  } else if (isExercise) {
    hint.textContent = state.demo
      ? 'Kurzes Ritual. Skip ist erlaubt.'
      : 'Eine Minute. Danach zurück in den Rhythmus.'
  } else if (approaching) {
    hint.textContent = 'Gleich. Die Schwelle kommt — kein Überraschungsalarm.'
  } else if (isConfirm) {
    const copy = confirmCopy(state.endedPhase)
    qs(root, 'confirm-lead').textContent = copy.lead
    qs(root, 'confirm-sub').textContent = copy.sub
    hint.textContent = 'Ein Tap reicht. (Du kannst auch später bestätigen.)'
  } else {
    hint.textContent = state.demo
      ? 'Demo-Tempo — Schwelle, Ritual, weiter.'
      : state.mode === 'lazy'
        ? 'Lazy Mode — die Hürde bleibt unten.'
        : 'Mikro-Dosis. Absagen ist aufwendiger als mitmachen.'
  }

  if (isExercise) {
    const ex = EXERCISES.find((e) => e.id === state.currentExerciseId)
    const mot = MOTIVATIONS.find((m) => m.id === state.currentMotivationId)
    qs(root, 'exercise-title').textContent = ex?.title ?? 'Übung'
    qs(root, 'exercise-hint').textContent = ex?.hint ?? ''
    qs(root, 'motivation').textContent = mot?.text ?? ''
  }
}

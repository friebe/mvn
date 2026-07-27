import type { AppState } from './state'
import { EXERCISES } from './exercises'
import { MOTIVATIONS } from './motivation'
import { confirmCopy, nextPhaseVerb, phaseLabel } from './modes'
import { formatTime } from './timer'

export interface UiHandlers {
  onStart: () => void
  onReset: () => void
  onFreeze: () => void
  onResume: () => void
  onExtendFreeze: () => void
  onSkip: () => void
  onToggleLazy: () => void
  onToggleDemo: () => void
  onToggleSound: () => void
  onEnableNotifications: () => void
  onInstall: () => void
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
        <button type="button" class="btn btn-primary" id="btn-install">App installieren</button>
      </section>

      <header class="top">
        <p class="brand">MVN</p>
        <p class="tag">Minimal Viable Movement</p>
      </header>

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
        <div class="row threshold-actions">
          <button type="button" class="btn btn-primary" id="btn-rise">Hochfahren</button>
          <button type="button" class="btn btn-ghost" id="btn-lazy-path">Lazy weiter</button>
          <button type="button" class="btn btn-danger" id="btn-freeze-path">Freeze</button>
        </div>
      </section>

      <section class="exercise" id="exercise" hidden>
        <p class="ritual-kicker">Ritual</p>
        <p class="exercise-title" id="exercise-title"></p>
        <p class="exercise-hint" id="exercise-hint"></p>
        <p class="motivation" id="motivation"></p>
        <button type="button" class="btn btn-ghost" id="btn-skip">Skip</button>
      </section>

      <section class="confirm" id="confirm" hidden>
        <p class="threshold-lead" id="confirm-lead">Tisch steht?</p>
        <p class="threshold-sub" id="confirm-sub">Ohne Bestätigung zählt die Runde nicht als echt. Ein Tap reicht.</p>
        <div class="row threshold-actions">
          <button type="button" class="btn btn-primary" id="btn-confirm-desk">Erledigt</button>
          <button type="button" class="btn btn-ghost" id="btn-confirm-later">Später</button>
        </div>
      </section>

      <section class="freeze-prompt" id="freeze-prompt" hidden>
        <p class="freeze-q">Call vorbei?</p>
        <div class="row">
          <button type="button" class="btn btn-primary" id="btn-call-done">Weiter</button>
          <button type="button" class="btn btn-ghost" id="btn-extend">Noch 15 Min</button>
        </div>
      </section>

      <footer class="controls">
        <div class="row" id="setup-controls">
          <button type="button" class="btn btn-primary" id="btn-start">Start</button>
          <button type="button" class="btn btn-ghost" id="btn-lazy-setup">Lazy Mode</button>
          <button type="button" class="btn btn-ghost" id="btn-demo">Demo</button>
          <button type="button" class="btn btn-ghost" id="btn-notif">Notifications</button>
          <a class="btn btn-ghost" id="link-analytics" href="/analytics.html">Analytics</a>
        </div>
        <div class="row" id="run-controls" hidden>
          <button type="button" class="btn btn-danger" id="btn-freeze">Freeze</button>
          <button type="button" class="btn btn-primary" id="btn-resume" hidden>Weiter</button>
          <button type="button" class="btn btn-ghost" id="btn-lazy">Lazy Mode</button>
          <button type="button" class="btn btn-ghost" id="btn-demo-run">Demo</button>
          <button type="button" class="btn btn-ghost" id="btn-sound">Sound an</button>
          <a class="btn btn-ghost" id="link-analytics-run" href="/analytics.html">Analytics</a>
          <button type="button" class="btn btn-ghost" id="btn-reset">Tagesabschluss</button>
        </div>
      </footer>
    </div>
  `

  qs(root, 'btn-start').addEventListener('click', handlers.onStart)
  qs(root, 'btn-reset').addEventListener('click', handlers.onReset)
  qs(root, 'btn-freeze').addEventListener('click', handlers.onFreeze)
  qs(root, 'btn-resume').addEventListener('click', handlers.onResume)
  qs(root, 'btn-call-done').addEventListener('click', handlers.onResume)
  qs(root, 'btn-extend').addEventListener('click', handlers.onExtendFreeze)
  qs(root, 'btn-skip').addEventListener('click', handlers.onSkip)
  qs(root, 'btn-lazy').addEventListener('click', handlers.onToggleLazy)
  qs(root, 'btn-lazy-setup').addEventListener('click', handlers.onToggleLazy)
  qs(root, 'btn-demo').addEventListener('click', handlers.onToggleDemo)
  qs(root, 'btn-demo-run').addEventListener('click', handlers.onToggleDemo)
  qs(root, 'btn-sound').addEventListener('click', handlers.onToggleSound)
  qs(root, 'btn-notif').addEventListener('click', handlers.onEnableNotifications)
  qs(root, 'btn-install').addEventListener('click', handlers.onInstall)
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

export function renderUi(
  root: HTMLElement,
  state: AppState,
  remainingMs: number,
  showFreezePrompt: boolean,
  approaching: boolean,
): void {
  const shell = root.querySelector('.shell') as HTMLElement
  shell.dataset.phase = state.phase
  shell.dataset.mode = state.mode
  shell.dataset.demo = state.demo ? 'true' : 'false'
  shell.dataset.approaching = approaching ? 'true' : 'false'
  shell.dataset.muted = state.soundEnabled ? 'false' : 'true'

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
  const btnLazy = qs(root, 'btn-lazy')
  const btnSound = qs(root, 'btn-sound')
  const btnDemo = qs(root, 'btn-demo')
  const btnDemoRun = qs(root, 'btn-demo-run')
  const btnRise = qs(root, 'btn-rise')

  const isSetup = state.phase === 'setup'
  const isConfirm = state.phase === 'confirm'
  const isFrozen = state.phase === 'frozen'
  const isExercise = state.phase === 'exercise'
  const isThreshold = state.phase === 'threshold'
  const isRunning =
    state.phase === 'sit' || state.phase === 'stand' || state.phase === 'reset'

  setupControls.hidden = !isSetup
  runControls.hidden = isSetup || isThreshold || isConfirm
  btnFreeze.hidden = isFrozen || isThreshold || isConfirm
  btnResume.hidden = !isFrozen
  freezePrompt.hidden = !(isFrozen && showFreezePrompt)
  exercise.hidden = !isExercise
  threshold.hidden = !isThreshold
  confirm.hidden = !isConfirm

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

  btnLazy.textContent = state.mode === 'lazy' ? 'Lazy an' : 'Lazy Mode'
  btnLazy.classList.toggle('is-on', state.mode === 'lazy')
  const btnLazySetup = qs(root, 'btn-lazy-setup')
  btnLazySetup.textContent = state.mode === 'lazy' ? 'Lazy an' : 'Lazy Mode'
  btnLazySetup.classList.toggle('is-on', state.mode === 'lazy')
  btnDemo.textContent = state.demo ? 'Demo an' : 'Demo'
  btnDemo.classList.toggle('is-on', state.demo)
  btnDemoRun.textContent = state.demo ? 'Demo an' : 'Demo'
  btnDemoRun.classList.toggle('is-on', state.demo)
  btnSound.textContent = state.soundEnabled ? 'Sound an' : 'Sound aus'
  btnSound.classList.toggle('is-on', state.soundEnabled)

  const muteHint = qs(root, 'mute-hint')
  if (!state.soundEnabled) {
    muteHint.hidden = false
    muteHint.textContent = state.notificationsEnabled
      ? 'Ton aus — Signale über Farbe, Tab-Titel und Notifications (am besten als installierte App).'
      : 'Ton aus — Notifications + App installieren für zuverlässige Hinweise am Zweitmonitor.'
  } else {
    muteHint.hidden = true
  }

  if (state.endedPhase) {
    btnRise.textContent = nextPhaseVerb(state.endedPhase)
  } else {
    btnRise.textContent = 'Hochfahren'
  }

  const ambientMot = MOTIVATIONS.find((m) => m.id === state.ambientMotivationId)
  if (isRunning && ambientMot) {
    ambient.hidden = false
    ambient.textContent = ambientMot.text
  } else {
    ambient.hidden = true
    ambient.textContent = ''
  }

  if (isSetup) {
    if (state.demo) {
      hint.textContent =
        state.mode === 'lazy'
          ? 'Demo Lazy: kurze Intervalle + Schwelle zum Entscheiden.'
          : 'Demo: kurze Intervalle. Am Ende entscheidest du — kein Auto-Alarm-Workout.'
    } else {
      hint.textContent =
        state.mode === 'lazy'
          ? 'Lazy: 20 Min sitzen → 3 Min stehen. Überlebensmodus.'
          : 'High: 30 Min sitzen → 5 Min stehen → 1 Min reset.'
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

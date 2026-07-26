import type { AppState } from './state'
import { EXERCISES } from './exercises'
import { MOTIVATIONS } from './motivation'
import { phaseLabel } from './modes'
import { formatTime } from './timer'

export interface UiHandlers {
  onStart: () => void
  onReset: () => void
  onFreeze: () => void
  onResume: () => void
  onExtendFreeze: () => void
  onSkip: () => void
  onToggleLazy: () => void
  onToggleSound: () => void
  onEnableNotifications: () => void
}

function qs<T extends HTMLElement>(root: HTMLElement, id: string): T {
  return root.querySelector(`#${id}`) as T
}

export function mountUi(root: HTMLElement, handlers: UiHandlers): void {
  root.innerHTML = `
    <div class="shell" data-phase="setup">
      <header class="top">
        <p class="brand">MVN</p>
        <p class="tag">Minimal Viable Movement</p>
      </header>

      <main class="stage">
        <p class="phase-label" id="phase-label">Setup</p>
        <p class="countdown" id="countdown" aria-live="polite">--:--</p>
        <p class="hint" id="hint">Wähle deinen Start — die Hürde bleibt lächerlich niedrig.</p>
      </main>

      <section class="exercise" id="exercise" hidden>
        <p class="exercise-title" id="exercise-title"></p>
        <p class="exercise-hint" id="exercise-hint"></p>
        <p class="motivation" id="motivation"></p>
        <button type="button" class="btn btn-ghost" id="btn-skip">Skip</button>
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
          <button type="button" class="btn btn-ghost" id="btn-notif">Notifications</button>
        </div>
        <div class="row" id="run-controls" hidden>
          <button type="button" class="btn btn-danger" id="btn-freeze">Freeze</button>
          <button type="button" class="btn btn-primary" id="btn-resume" hidden>Weiter</button>
          <button type="button" class="btn btn-ghost" id="btn-lazy">Lazy Mode</button>
          <button type="button" class="btn btn-ghost" id="btn-sound">Sound an</button>
          <button type="button" class="btn btn-ghost" id="btn-reset">Tag reset</button>
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
  qs(root, 'btn-sound').addEventListener('click', handlers.onToggleSound)
  qs(root, 'btn-notif').addEventListener('click', handlers.onEnableNotifications)
}

export function renderUi(
  root: HTMLElement,
  state: AppState,
  remainingMs: number,
  showFreezePrompt: boolean,
): void {
  const shell = root.querySelector('.shell') as HTMLElement
  shell.dataset.phase = state.phase
  shell.dataset.mode = state.mode

  const phaseEl = qs(root, 'phase-label')
  const countdown = qs(root, 'countdown')
  const hint = qs(root, 'hint')
  const exercise = qs(root, 'exercise')
  const freezePrompt = qs(root, 'freeze-prompt')
  const setupControls = qs(root, 'setup-controls')
  const runControls = qs(root, 'run-controls')
  const btnFreeze = qs<HTMLButtonElement>(root, 'btn-freeze')
  const btnResume = qs<HTMLButtonElement>(root, 'btn-resume')
  const btnLazy = qs(root, 'btn-lazy')
  const btnSound = qs(root, 'btn-sound')

  const isSetup = state.phase === 'setup'
  const isFrozen = state.phase === 'frozen'
  const isExercise = state.phase === 'exercise'

  setupControls.hidden = !isSetup
  runControls.hidden = isSetup
  btnFreeze.hidden = isFrozen
  btnResume.hidden = !isFrozen
  freezePrompt.hidden = !(isFrozen && showFreezePrompt)
  exercise.hidden = !isExercise

  phaseEl.textContent = phaseLabel(state.phase)
  countdown.textContent = isSetup ? '--:--' : formatTime(remainingMs)

  btnLazy.textContent = state.mode === 'lazy' ? 'Lazy an' : 'Lazy Mode'
  btnLazy.classList.toggle('is-on', state.mode === 'lazy')
  const btnLazySetup = qs(root, 'btn-lazy-setup')
  btnLazySetup.textContent = state.mode === 'lazy' ? 'Lazy an' : 'Lazy Mode'
  btnLazySetup.classList.toggle('is-on', state.mode === 'lazy')
  btnSound.textContent = state.soundEnabled ? 'Sound an' : 'Sound aus'

  if (isSetup) {
    hint.textContent =
      state.mode === 'lazy'
        ? 'Lazy: 20 Min sitzen → 3 Min stehen. Überlebensmodus.'
        : 'High: 30 Min sitzen → 5 Min stehen → 1 Min reset.'
  } else if (isFrozen) {
    hint.textContent = showFreezePrompt
      ? 'Timer pausiert. Kein Stress wegen verpasster Intervalle.'
      : 'Freeze aktiv — Call-Schutz läuft.'
  } else if (isExercise) {
    hint.textContent = '60 Sekunden. Skip ist erlaubt.'
  } else {
    hint.textContent =
      state.mode === 'lazy'
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

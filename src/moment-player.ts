import { formatExactTime, remainingRatio } from './atmosphere'

export interface MomentPlayerState {
  phaseLabel?: string
  title: string
  hint: string
  remainingMs: number
  durationMs: number
  figureHtml?: string
  cue?: string
  ending?: boolean
}

export interface MomentPlayerExtraActions {
  skipLabel?: string
  stopLabel?: string
}

export interface MomentPlayerHandlers {
  onDone: () => void
  onSkip?: () => void
  onStop?: () => void
}

function barScale(remainingMs: number, durationMs: number): number {
  return Math.max(0, Math.min(1, remainingRatio(remainingMs, durationMs)))
}

function shellStyle(): string {
  return '--atmosphere-hue: var(--color-accent-2);'
}

export function momentPlayerHtml(
  state: MomentPlayerState,
  extra?: MomentPlayerExtraActions,
): string {
  const phaseLabel = state.phaseLabel ?? 'Moment'
  const scale = barScale(state.remainingMs, state.durationMs)
  const clock = formatExactTime(state.remainingMs)
  const showExtra = extra?.skipLabel || extra?.stopLabel

  return `
    <div class="moment-player-shell" data-phase="exercise"${state.ending ? ' data-ending="true"' : ''} style="${shellStyle()}">
      <div class="frame">
        <div class="content-area">
          <div class="middle">
            <main class="stage">
              <p class="phase-label">${phaseLabel}</p>
              <div class="atmosphere is-timed" aria-live="polite">
                <div class="atmosphere-hit" aria-hidden="true">
                  <span class="atmosphere-label" data-mp="clock">${clock}</span>
                </div>
                <p class="play-cue" data-mp="cue"${state.cue ? '' : ' hidden'}>${state.cue ?? ''}</p>
                <div class="desk-edge-row">
                  <div class="desk-edge" aria-hidden="true">
                    <span class="desk-edge-fill" data-mp="bar" style="transform: scaleX(${scale})"></span>
                  </div>
                </div>
              </div>
            </main>
            <section class="exercise">
              <div class="exercise-focus">
                <div class="exercise-figure" data-mp="figure"${state.figureHtml ? '' : ' hidden'}>${state.figureHtml ?? ''}</div>
                <div class="exercise-copy">
                  <p class="exercise-title" data-mp="title">${state.title}</p>
                  <p class="exercise-hint" data-mp="hint">${state.hint}</p>
                </div>
              </div>
            </section>
          </div>
          <nav class="primary-actions" aria-label="Actions">
            <div class="row exercise-actions">
              <button type="button" class="btn btn-primary" data-mp="done">Done</button>
            </div>
            ${
              showExtra
                ? `
            <div class="row pick-actions">
              ${extra?.skipLabel ? `<button type="button" class="btn btn-ghost pick-skip" data-mp="skip">${extra.skipLabel}</button>` : ''}
              ${extra?.stopLabel ? `<button type="button" class="btn btn-ghost pick-skip" data-mp="stop">${extra.stopLabel}</button>` : ''}
            </div>`
                : ''
            }
          </nav>
        </div>
      </div>
    </div>
  `
}

export function updateMomentPlayer(root: HTMLElement, state: MomentPlayerState): void {
  const shell = root.querySelector<HTMLElement>('.moment-player-shell')
  if (!shell) return

  const clock = shell.querySelector<HTMLElement>('[data-mp="clock"]')
  const bar = shell.querySelector<HTMLElement>('[data-mp="bar"]')
  const title = shell.querySelector<HTMLElement>('[data-mp="title"]')
  const hint = shell.querySelector<HTMLElement>('[data-mp="hint"]')
  const cue = shell.querySelector<HTMLElement>('[data-mp="cue"]')
  const figure = shell.querySelector<HTMLElement>('[data-mp="figure"]')

  const nextClock = formatExactTime(state.remainingMs)
  if (clock && clock.textContent !== nextClock) clock.textContent = nextClock

  const scale = barScale(state.remainingMs, state.durationMs)
  if (bar) bar.style.transform = `scaleX(${scale})`

  if (title && title.textContent !== state.title) title.textContent = state.title
  if (hint && hint.textContent !== state.hint) hint.textContent = state.hint
  const nextCue = state.cue ?? ''
  if (cue) {
    if (cue.textContent !== nextCue) cue.textContent = nextCue
    cue.hidden = nextCue === ''
  }
  if (state.ending) shell.dataset.ending = 'true'
  else delete shell.dataset.ending
  if (figure && state.figureHtml !== undefined) {
    if (figure.innerHTML !== state.figureHtml) figure.innerHTML = state.figureHtml
    figure.hidden = state.figureHtml === ''
  }
}

export function bindMomentPlayer(root: HTMLElement, handlers: MomentPlayerHandlers): void {
  root.querySelector<HTMLButtonElement>('[data-mp="done"]')?.addEventListener('click', handlers.onDone)
  root.querySelector<HTMLButtonElement>('[data-mp="skip"]')?.addEventListener('click', () => handlers.onSkip?.())
  root.querySelector<HTMLButtonElement>('[data-mp="stop"]')?.addEventListener('click', () => handlers.onStop?.())
}

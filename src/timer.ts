import { playBeep } from './audio'
import { EXERCISE_MS, FREEZE_EXTEND_MS, FREEZE_PROMPT_MS, type ActivePhase, type AppState, type EnergyMode } from './state'
import { durationFor, nextActivePhase, phaseLabel } from './modes'
import { pickExercise, rememberId } from './exercises'
import { pickMotivation, rememberMotivation } from './motivation'
import { notifyPhase } from './notify'

export type TimerListener = (state: AppState, remainingMs: number, showFreezePrompt: boolean) => void

let state: AppState
let tickId: number | null = null
let listeners: TimerListener[] = []
let motivationPickCount = 0

export function getState(): AppState {
  return state
}

export function subscribe(fn: TimerListener): () => void {
  listeners.push(fn)
  return () => {
    listeners = listeners.filter((l) => l !== fn)
  }
}

function emit(): void {
  const remaining = remainingMs()
  const showPrompt = shouldShowFreezePrompt()
  for (const l of listeners) l(state, remaining, showPrompt)
}

function remainingMs(): number {
  if (state.phase === 'frozen') {
    return state.frozenRemainingMs ?? 0
  }
  if (state.phaseEndsAt == null) return 0
  return Math.max(0, state.phaseEndsAt - Date.now())
}

function shouldShowFreezePrompt(): boolean {
  if (state.phase !== 'frozen' || state.frozenAt == null) return false
  if (state.freezeExtendUntil != null && Date.now() < state.freezeExtendUntil) return false
  return Date.now() - state.frozenAt >= FREEZE_PROMPT_MS
}

export function initTimer(initial: AppState): void {
  state = initial
  motivationPickCount = initial.recentMotivationIds.length
  startTicking()
  emit()
}

function startTicking(): void {
  if (tickId != null) return
  tickId = window.setInterval(() => {
    onTick()
  }, 250)
}

function onTick(): void {
  if (state.phase === 'setup' || state.phase === 'frozen') {
    emit()
    return
  }
  if (state.phaseEndsAt != null && Date.now() >= state.phaseEndsAt) {
    onPhaseComplete()
  }
  emit()
}

function alertUser(title: string, body: string): void {
  playBeep(state.soundEnabled)
  notifyPhase(title, body, state.notificationsEnabled)
  document.title = `MVN · ${title}`
}

function onPhaseComplete(): void {
  if (state.phase === 'exercise') {
    enterActivePhase(state.pendingNextPhase ?? 'sit')
    return
  }
  if (state.phase === 'sit' || state.phase === 'stand' || state.phase === 'reset') {
    const ended = state.phase
    const next = nextActivePhase(ended)
    enterExercise(ended, next)
  }
}

function enterExercise(_ended: ActivePhase, next: ActivePhase): void {
  const exercise = pickExercise(state.mode, state.recentExerciseIds)
  motivationPickCount += 1
  const motivation = pickMotivation(state.mode, state.recentMotivationIds, motivationPickCount)

  state = {
    ...state,
    phase: 'exercise',
    phaseEndsAt: Date.now() + EXERCISE_MS,
    pendingNextPhase: next,
    currentExerciseId: exercise.id,
    currentMotivationId: motivation.id,
    recentExerciseIds: rememberId(state.recentExerciseIds, exercise.id),
    recentMotivationIds: rememberMotivation(state.recentMotivationIds, motivation.id),
  }
  alertUser('Mikro-Übung', exercise.title)
  emit()
}

function enterActivePhase(phase: ActivePhase): void {
  const ms = durationFor(state.mode, phase)
  state = {
    ...state,
    phase,
    phaseEndsAt: Date.now() + ms,
    pendingNextPhase: null,
    currentExerciseId: null,
    currentMotivationId: null,
  }
  alertUser(phaseLabel(phase), `${Math.round(ms / 60000)} Min.`)
  emit()
}

export function startDay(mode: EnergyMode = state.mode): void {
  state = {
    ...state,
    mode,
    startedAt: Date.now(),
    frozenAt: null,
    frozenRemainingMs: null,
    freezeExtendUntil: null,
    frozenPhase: null,
  }
  enterActivePhase('sit')
}

export function resetDay(): void {
  state = {
    ...state,
    phase: 'setup',
    phaseEndsAt: null,
    frozenAt: null,
    frozenRemainingMs: null,
    freezeExtendUntil: null,
    frozenPhase: null,
    startedAt: null,
    pendingNextPhase: null,
    currentExerciseId: null,
    currentMotivationId: null,
  }
  document.title = 'MVN'
  emit()
}

export function setMode(mode: EnergyMode): void {
  if (state.mode === mode) return
  state = { ...state, mode }
  if (state.phase === 'sit' || state.phase === 'stand' || state.phase === 'reset') {
    // Restart current phase with new duration (plan decision)
    enterActivePhase(state.phase)
    return
  }
  emit()
}

export function toggleSound(): void {
  state = { ...state, soundEnabled: !state.soundEnabled }
  emit()
}

export function setNotificationsEnabled(enabled: boolean): void {
  state = { ...state, notificationsEnabled: enabled }
  emit()
}

export function freeze(): void {
  if (state.phase === 'frozen' || state.phase === 'setup') return
  const rem =
    state.phase === 'exercise' ||
    state.phase === 'sit' ||
    state.phase === 'stand' ||
    state.phase === 'reset'
      ? remainingMs()
      : 0
  const frozenPhase: ActivePhase | null =
    state.phase === 'sit' || state.phase === 'stand' || state.phase === 'reset'
      ? state.phase
      : state.pendingNextPhase

  state = {
    ...state,
    phase: 'frozen',
    phaseEndsAt: null,
    frozenRemainingMs: rem,
    frozenAt: Date.now(),
    freezeExtendUntil: null,
    frozenPhase,
  }
  document.title = 'MVN · Freeze'
  emit()
}

export function resume(): void {
  if (state.phase !== 'frozen') return
  const rem = state.frozenRemainingMs ?? 0
  const phase = state.frozenPhase ?? 'sit'

  if (state.currentExerciseId) {
    state = {
      ...state,
      phase: 'exercise',
      phaseEndsAt: Date.now() + Math.max(rem, 1000),
      frozenAt: null,
      frozenRemainingMs: null,
      freezeExtendUntil: null,
    }
  } else {
    state = {
      ...state,
      phase,
      phaseEndsAt: Date.now() + Math.max(rem, 1000),
      frozenAt: null,
      frozenRemainingMs: null,
      freezeExtendUntil: null,
      frozenPhase: null,
    }
  }
  document.title = `MVN · ${phaseLabel(state.phase)}`
  emit()
}

export function extendFreeze(): void {
  if (state.phase !== 'frozen') return
  state = {
    ...state,
    freezeExtendUntil: Date.now() + FREEZE_EXTEND_MS,
    frozenAt: Date.now(), // reset prompt clock
  }
  emit()
}

export function skipExercise(): void {
  if (state.phase !== 'exercise') return
  enterActivePhase(state.pendingNextPhase ?? 'sit')
}

export function formatTime(ms: number): string {
  const totalSec = Math.ceil(ms / 1000)
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

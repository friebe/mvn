import { playBeep } from './audio'
import {
  flashShell,
  setBaseTitle,
  setNeedsAction,
  startTitleBlink,
  stopTitleBlink,
  type AttentionKind,
} from './attention'
import {
  EXERCISE_MS,
  FORESHADOW_RATIO,
  FREEZE_EXTEND_MS,
  FREEZE_PROMPT_MS,
  type ActivePhase,
  type AppState,
  type EnergyMode,
} from './state'
import {
  DEMO_EXERCISE_MS,
  DEMO_FREEZE_EXTEND_MS,
  DEMO_FREEZE_PROMPT_MS,
  durationFor,
  formatDurationHint,
  nextActivePhase,
  phaseLabel,
} from './modes'
import { pickExercise, rememberId } from './exercises'
import { pickAmbient, pickMotivation, rememberMotivation } from './motivation'
import { notifyPhase } from './notify'
import { recordStat, todayKey } from './stats'

export type TimerListener = (
  state: AppState,
  remainingMs: number,
  showFreezePrompt: boolean,
  approaching: boolean,
) => void

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
  const approaching = isApproaching(remaining)
  for (const l of listeners) l(state, remaining, showPrompt, approaching)
}

function remainingMs(): number {
  if (state.phase === 'frozen') {
    return state.frozenRemainingMs ?? 0
  }
  if (state.phase === 'threshold' || state.phase === 'setup') return 0
  if (state.phaseEndsAt == null) return 0
  return Math.max(0, state.phaseEndsAt - Date.now())
}

function isApproaching(remaining: number): boolean {
  if (state.phase !== 'sit' && state.phase !== 'stand' && state.phase !== 'reset') {
    return false
  }
  if (!state.phaseDurationMs || state.phaseDurationMs <= 0) return false
  if (remaining <= 0) return false
  return remaining / state.phaseDurationMs <= FORESHADOW_RATIO
}

function freezePromptMs(): number {
  return state.demo ? DEMO_FREEZE_PROMPT_MS : FREEZE_PROMPT_MS
}

function freezeExtendMs(): number {
  return state.demo ? DEMO_FREEZE_EXTEND_MS : FREEZE_EXTEND_MS
}

function exerciseMs(): number {
  return state.demo ? DEMO_EXERCISE_MS : EXERCISE_MS
}

function shouldShowFreezePrompt(): boolean {
  if (state.phase !== 'frozen' || state.frozenAt == null) return false
  if (state.freezeExtendUntil != null && Date.now() < state.freezeExtendUntil) return false
  return Date.now() - state.frozenAt >= freezePromptMs()
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
  if (state.phase === 'setup' || state.phase === 'frozen' || state.phase === 'threshold') {
    emit()
    return
  }

  const rem = remainingMs()
  if (
    isApproaching(rem) &&
    !state.foreshadowFired &&
    (state.phase === 'sit' || state.phase === 'stand' || state.phase === 'reset')
  ) {
    state = { ...state, foreshadowFired: true }
    signalAttention('foreshadow', 'Gleich', 'Schwelle kommt.')
  }

  if (state.phaseEndsAt != null && Date.now() >= state.phaseEndsAt) {
    onPhaseComplete()
  }
  emit()
}

function shouldNotify(muted: boolean): boolean {
  if (state.notificationsEnabled) return true
  // Ton aus + Permission schon da → trotzdem pingen (zweiter Monitor)
  return muted && 'Notification' in window && Notification.permission === 'granted'
}

function signalAttention(kind: AttentionKind, title: string, body: string): void {
  const muted = !state.soundEnabled
  playBeep(state.soundEnabled)
  void notifyPhase(`MVN · ${title}`, body, shouldNotify(muted))
  flashShell(kind, muted)

  if (kind === 'threshold') {
    setNeedsAction(true)
    if (muted) startTitleBlink(title)
    else {
      stopTitleBlink()
      setBaseTitle(`MVN · ${title}`)
    }
  } else {
    setNeedsAction(false)
    stopTitleBlink()
    setBaseTitle(`MVN · ${title}`)
  }
}

function clearAttention(): void {
  setNeedsAction(false)
  stopTitleBlink()
}

function onPhaseComplete(): void {
  if (state.phase === 'exercise') {
    clearAttention()
    recordStat('ritual_done')
    if (state.pendingNextPhase === 'stand') {
      // USP-Kniff: nur ein Tap macht aus "Timer" einen echten Wechsel.
      state = {
        ...state,
        phase: 'confirm',
        phaseEndsAt: null,
        phaseDurationMs: null,
        foreshadowFired: false,
        currentExerciseId: null,
        currentMotivationId: null,
        resumeToThreshold: false,
        resumeToConfirm: false,
      }
      signalAttention('threshold', 'Beweis', 'Tisch steht? Ein Tap reicht.')
      emit()
      return
    }

    enterActivePhase(state.pendingNextPhase ?? 'sit', { soft: true })
    return
  }
  if (state.phase === 'sit' || state.phase === 'stand' || state.phase === 'reset') {
    enterThreshold(state.phase)
  }
}

function enterThreshold(ended: ActivePhase): void {
  const next = nextActivePhase(ended)
  if (ended === 'sit') recordStat('sit_done')
  else if (ended === 'stand') recordStat('stand_done')
  else recordStat('reset_done')

  state = {
    ...state,
    phase: 'threshold',
    phaseEndsAt: null,
    phaseDurationMs: null,
    foreshadowFired: false,
    endedPhase: ended,
    pendingNextPhase: next,
    currentExerciseId: null,
    currentMotivationId: null,
    resumeToThreshold: false,
  }
  signalAttention('threshold', 'Schwelle', 'Du entscheidest.')
  emit()
}

function enterRitual(): void {
  const next = state.pendingNextPhase ?? 'sit'
  const exercise = pickExercise(state.mode, state.recentExerciseIds)
  motivationPickCount += 1
  const motivation = pickMotivation(state.mode, state.recentMotivationIds, motivationPickCount)

  clearAttention()
  state = {
    ...state,
    phase: 'exercise',
    phaseEndsAt: Date.now() + exerciseMs(),
    phaseDurationMs: exerciseMs(),
    foreshadowFired: false,
    pendingNextPhase: next,
    currentExerciseId: exercise.id,
    currentMotivationId: motivation.id,
    recentExerciseIds: rememberId(state.recentExerciseIds, exercise.id),
    recentMotivationIds: rememberMotivation(state.recentMotivationIds, motivation.id),
  }
  signalAttention('ritual', 'Ritual', exercise.title)
  emit()
}

function enterActivePhase(phase: ActivePhase, opts: { soft?: boolean } = {}): void {
  const ms = durationFor(state.mode, phase, state.demo)
  const ambient = pickAmbient(state.recentMotivationIds)

  clearAttention()
  state = {
    ...state,
    phase,
    phaseEndsAt: Date.now() + ms,
    phaseDurationMs: ms,
    foreshadowFired: false,
    pendingNextPhase: null,
    endedPhase: null,
    currentExerciseId: null,
    currentMotivationId: null,
    ambientMotivationId: ambient.id,
    recentMotivationIds: rememberMotivation(state.recentMotivationIds, ambient.id),
    resumeToThreshold: false,
  }

  if (opts.soft) {
    setBaseTitle(`MVN · ${phaseLabel(phase)}`)
  } else {
    signalAttention('phase', phaseLabel(phase), formatDurationHint(ms, state.demo))
  }
  emit()
}

/** Threshold → Ritual (Hochfahren) */
export function chooseRise(): void {
  if (state.phase !== 'threshold') return
  recordStat('rise')
  enterRitual()
}

/** Threshold → Lazy + next phase without ritual */
export function chooseLazyPath(): void {
  if (state.phase !== 'threshold') return
  recordStat('lazy_choice')
  clearAttention()
  const next = state.pendingNextPhase ?? 'sit'
  state = { ...state, mode: 'lazy' }
  if (next === 'stand') {
    state = {
      ...state,
      phase: 'confirm',
      phaseEndsAt: null,
      phaseDurationMs: null,
      foreshadowFired: false,
      currentExerciseId: null,
      currentMotivationId: null,
      resumeToThreshold: false,
      resumeToConfirm: false,
    }
    signalAttention('threshold', 'Beweis', 'Tisch steht? Ein Tap reicht.')
    emit()
    return
  }
  enterActivePhase(next, { soft: true })
}

/** Threshold → Freeze (call) */
export function chooseFreezePath(): void {
  if (state.phase !== 'threshold') return
  recordStat('freeze_choice')
  clearAttention()
  state = {
    ...state,
    phase: 'frozen',
    phaseEndsAt: null,
    frozenRemainingMs: 0,
    frozenAt: Date.now(),
    freezeExtendUntil: null,
    frozenPhase: null,
    resumeToThreshold: true,
  }
  setBaseTitle('MVN · Freeze')
  emit()
}

export function startDay(mode: EnergyMode = state.mode): void {
  recordStat('day_start')
  state = {
    ...state,
    mode,
    startedAt: Date.now(),
    frozenAt: null,
    frozenRemainingMs: null,
    freezeExtendUntil: null,
    frozenPhase: null,
    resumeToThreshold: false,
  }
  enterActivePhase('sit')
}

export function resetDay(): void {
  const closeKey = todayKey()
  if (state.dayClosedKey !== closeKey) {
    recordStat('day_close')
  }
  clearAttention()
  state = {
    ...state,
    phase: 'setup',
    phaseEndsAt: null,
    phaseDurationMs: null,
    foreshadowFired: false,
    frozenAt: null,
    frozenRemainingMs: null,
    freezeExtendUntil: null,
    frozenPhase: null,
    resumeToThreshold: false,
    resumeToConfirm: false,
    startedAt: null,
    pendingNextPhase: null,
    endedPhase: null,
    currentExerciseId: null,
    currentMotivationId: null,
    ambientMotivationId: null,
    dayClosedKey: closeKey,
  }
  setBaseTitle('MVN')
  emit()
}

export function confirmDesk(): void {
  if (state.phase !== 'confirm') return
  recordStat('desk_confirmed')
  clearAttention()
  enterActivePhase(state.pendingNextPhase ?? 'sit', { soft: true })
}

export function confirmDeskLater(): void {
  if (state.phase !== 'confirm') return
  clearAttention()
  enterActivePhase(state.pendingNextPhase ?? 'sit', { soft: true })
}

export function setMode(mode: EnergyMode): void {
  if (state.mode === mode) return
  state = { ...state, mode }
  if (state.phase === 'sit' || state.phase === 'stand' || state.phase === 'reset') {
    enterActivePhase(state.phase)
    return
  }
  emit()
}

export function setDemo(demo: boolean): void {
  if (state.demo === demo) return
  state = { ...state, demo }
  if (state.phase === 'sit' || state.phase === 'stand' || state.phase === 'reset') {
    enterActivePhase(state.phase)
    return
  }
  emit()
}

export function toggleDemo(): void {
  setDemo(!state.demo)
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

  if (state.phase === 'threshold') {
    chooseFreezePath()
    return
  }

  recordStat('freeze_manual')

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
    resumeToThreshold: false,
  }
  clearAttention()
  setBaseTitle('MVN · Freeze')
  emit()
}

export function resume(): void {
  if (state.phase !== 'frozen') return

  if (state.resumeToThreshold) {
    const ended = state.endedPhase ?? 'sit'
    state = {
      ...state,
      frozenAt: null,
      frozenRemainingMs: null,
      freezeExtendUntil: null,
      resumeToThreshold: false,
    }
    enterThreshold(ended)
    return
  }

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
      phaseDurationMs: state.phaseDurationMs ?? rem,
      frozenAt: null,
      frozenRemainingMs: null,
      freezeExtendUntil: null,
      frozenPhase: null,
    }
  }
  setBaseTitle(`MVN · ${phaseLabel(state.phase)}`)
  emit()
}

export function extendFreeze(): void {
  if (state.phase !== 'frozen') return
  state = {
    ...state,
    freezeExtendUntil: Date.now() + freezeExtendMs(),
    frozenAt: Date.now(),
  }
  emit()
}

export function skipExercise(): void {
  if (state.phase !== 'exercise') return
  recordStat('ritual_skip')
  enterActivePhase(state.pendingNextPhase ?? 'sit', { soft: true })
}

export function formatTime(ms: number): string {
  const totalSec = Math.ceil(ms / 1000)
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

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
  CHECKIN_RATIO,
  CHECKIN_TIMEOUT_MS,
  DEMO_CHECKIN_TIMEOUT_MS,
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
import { getMoment, pickMoment, pickMomentCards, rememberId } from './exercises'
import { pickAmbient, pickMotivation, rememberMotivation } from './motivation'
import { notifyPhase } from './notify'
import { buildDayCloseLine, recordStat, summarizeToday, todayKey } from './stats'

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
  if (
    state.phase === 'threshold' ||
    state.phase === 'setup' ||
    state.phase === 'pick' ||
    state.phase === 'confirm'
  ) {
    return 0
  }
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

function momentMs(): number {
  return state.demo ? DEMO_EXERCISE_MS : EXERCISE_MS
}

function checkInTimeoutMs(): number {
  return state.demo ? DEMO_CHECKIN_TIMEOUT_MS : CHECKIN_TIMEOUT_MS
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
  if (
    state.phase === 'setup' ||
    state.phase === 'frozen' ||
    state.phase === 'threshold' ||
    state.phase === 'pick' ||
    state.phase === 'confirm'
  ) {
    emit()
    return
  }

  maybeShowCheckIn()
  maybeTimeoutCheckIn()

  const rem = remainingMs()
  if (
    isApproaching(rem) &&
    !state.foreshadowFired &&
    (state.phase === 'sit' || state.phase === 'stand' || state.phase === 'reset')
  ) {
    state = { ...state, foreshadowFired: true }
    signalAttention('foreshadow', 'Gleich', 'Tisch meldet sich bald.')
  }

  if (state.phaseEndsAt != null && Date.now() >= state.phaseEndsAt) {
    onPhaseComplete()
  }
  emit()
}

function maybeShowCheckIn(): void {
  if (state.phase !== 'sit' && state.phase !== 'stand') return
  if (state.checkInHandled || state.checkInShownAt != null) return
  if (state.checkInAt == null || Date.now() < state.checkInAt) return

  state = {
    ...state,
    checkInShownAt: Date.now(),
  }
  signalAttention('foreshadow', 'Check-in', checkInPrompt())
}

function maybeTimeoutCheckIn(): void {
  if (state.checkInShownAt == null || state.checkInHandled) return
  if (state.phase !== 'sit' && state.phase !== 'stand') return
  if (Date.now() - state.checkInShownAt < checkInTimeoutMs()) return

  const ended = state.phase
  state = {
    ...state,
    checkInHandled: true,
    checkInShownAt: null,
    checkInAt: null,
  }
  enterThreshold(ended)
}

function checkInPrompt(): string {
  return state.phase === 'stand' ? 'Noch am Stehen?' : 'Noch am Tisch?'
}

function shouldNotify(muted: boolean): boolean {
  if (state.notificationsEnabled) return true
  return muted && 'Notification' in window && Notification.permission === 'granted'
}

function signalAttention(kind: AttentionKind, title: string, body: string): void {
  const muted = !state.soundEnabled
  playBeep(state.soundEnabled)
  void notifyPhase(`MVN · ${title}`, body, shouldNotify(muted), {
    persistent: state.notificationPersistent,
    playSound: state.soundEnabled,
  })
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

    if (state.resumeAfterAfterplay) {
      finishAfterplay()
      return
    }

    if (state.pendingNextPhase === 'stand') {
      state = {
        ...state,
        phase: 'confirm',
        phaseEndsAt: null,
        phaseDurationMs: null,
        foreshadowFired: false,
        currentExerciseId: null,
        currentMotivationId: null,
        momentChoiceIds: null,
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

function finishAfterplay(): void {
  const rem = state.frozenRemainingMs ?? 0
  const phase = state.frozenPhase ?? 'sit'
  state = {
    ...state,
    phase,
    phaseEndsAt: Date.now() + Math.max(rem, 1000),
    phaseDurationMs: state.phaseDurationMs ?? rem,
    foreshadowFired: false,
    frozenAt: null,
    frozenRemainingMs: null,
    freezeExtendUntil: null,
    frozenPhase: null,
    resumeAfterAfterplay: false,
    currentExerciseId: null,
    currentMotivationId: null,
    momentChoiceIds: null,
  }
  setBaseTitle(`MVN · ${phaseLabel(phase)}`)
  emit()
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
    momentChoiceIds: null,
    checkInAt: null,
    checkInShownAt: null,
    checkInHandled: true,
    resumeToThreshold: false,
    resumeAfterAfterplay: false,
  }
  signalAttention(
    'threshold',
    'Tisch',
    ended === 'sit' ? 'Tisch will hoch.' : 'Tisch wartet.',
  )
  emit()
}

function enterPick(): void {
  const cards = pickMomentCards(state.mode, state.recentExerciseIds)
  clearAttention()
  state = {
    ...state,
    phase: 'pick',
    phaseEndsAt: null,
    phaseDurationMs: null,
    foreshadowFired: false,
    momentChoiceIds: cards.map((c) => c.id),
    currentExerciseId: null,
    currentMotivationId: null,
    momentRerolled: false,
  }
  signalAttention('ritual', 'Moment', 'Drei Karten. Eine reicht.')
  emit()
}

function enterRitualWithMoment(momentId: string): void {
  const moment = getMoment(momentId) ?? pickMoment(state.mode, state.recentExerciseIds)
  const next = state.pendingNextPhase ?? 'sit'
  motivationPickCount += 1
  const motivation = pickMotivation(state.mode, state.recentMotivationIds, motivationPickCount)

  clearAttention()
  state = {
    ...state,
    phase: 'exercise',
    phaseEndsAt: Date.now() + momentMs(),
    phaseDurationMs: momentMs(),
    foreshadowFired: false,
    pendingNextPhase: next,
    currentExerciseId: moment.id,
    currentMotivationId: motivation.id,
    recentExerciseIds: rememberId(state.recentExerciseIds, moment.id),
    recentMotivationIds: rememberMotivation(state.recentMotivationIds, motivation.id),
    momentChoiceIds: null,
    momentRerolled: false,
  }
  signalAttention('ritual', 'Moment', moment.title)
  emit()
}

function enterActivePhase(phase: ActivePhase, opts: { soft?: boolean } = {}): void {
  const ms = durationFor(state.mode, phase, state.demo, state.intervals)
  const day = todayKey()
  let ambientId: string | null = null
  let recentMot = state.recentMotivationIds
  let northKey = state.northShownKey

  if (phase === 'sit' && northKey !== day) {
    const ambient = pickAmbient(recentMot)
    ambientId = ambient.id
    recentMot = rememberMotivation(recentMot, ambient.id)
    northKey = day
  }

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
    ambientMotivationId: ambientId,
    recentMotivationIds: recentMot,
    northShownKey: northKey,
    resumeToThreshold: false,
    resumeAfterAfterplay: false,
    momentChoiceIds: null,
    checkInAt:
      phase === 'sit' || phase === 'stand' ? Date.now() + ms * CHECKIN_RATIO : null,
    checkInShownAt: null,
    checkInHandled: false,
  }

  if (opts.soft) {
    setBaseTitle(`MVN · ${phaseLabel(phase)}`)
  } else {
    signalAttention('phase', phaseLabel(phase), formatDurationHint(ms, state.demo))
  }
  emit()
}

/** Threshold → next phase without moment pick (stand → reset). */
function advanceThresholdNext(): void {
  clearAttention()
  const next = state.pendingNextPhase ?? 'sit'
  if (next === 'stand') {
    state = {
      ...state,
      phase: 'confirm',
      phaseEndsAt: null,
      phaseDurationMs: null,
      foreshadowFired: false,
      currentExerciseId: null,
      currentMotivationId: null,
      momentChoiceIds: null,
      resumeToThreshold: false,
      resumeToConfirm: false,
    }
    signalAttention('threshold', 'Beweis', 'Tisch steht? Ein Tap reicht.')
    emit()
    return
  }
  enterActivePhase(next, { soft: true })
}

/** Threshold primary — moment only on desk up (sit) or down (reset). */
export function chooseRise(): void {
  if (state.phase !== 'threshold') return
  const ended = state.endedPhase

  if (ended === 'sit' || ended === 'reset') {
    recordStat('rise')
    enterPick()
    return
  }

  advanceThresholdNext()
}

export function chooseMoment(momentId: string): void {
  if (state.phase !== 'pick') return
  if (!state.momentChoiceIds?.includes(momentId)) return
  enterRitualWithMoment(momentId)
}

/** Skip ritual — standing is enough */
export function skipStanding(): void {
  if (state.phase !== 'pick' && state.phase !== 'exercise') return
  recordStat('ritual_skip')
  clearAttention()
  const next = state.pendingNextPhase ?? 'sit'
  state = {
    ...state,
    momentChoiceIds: null,
    currentExerciseId: null,
    currentMotivationId: null,
  }
  if (next === 'stand') {
    state = {
      ...state,
      phase: 'confirm',
      phaseEndsAt: null,
      phaseDurationMs: null,
      foreshadowFired: false,
      resumeToThreshold: false,
      resumeToConfirm: false,
    }
    signalAttention('threshold', 'Beweis', 'Tisch steht? Ein Tap reicht.')
    emit()
    return
  }
  enterActivePhase(next, { soft: true })
}

export function completeMoment(): void {
  if (state.phase !== 'exercise') return
  state = { ...state, phaseEndsAt: Date.now() }
  onPhaseComplete()
}

export function rerollMoment(): void {
  if (state.phase !== 'exercise' || state.momentRerolled) return
  const moment = pickMoment(state.mode, state.recentExerciseIds)
  state = {
    ...state,
    currentExerciseId: moment.id,
    recentExerciseIds: rememberId(state.recentExerciseIds, moment.id),
    momentRerolled: true,
    phaseEndsAt: Date.now() + momentMs(),
    phaseDurationMs: momentMs(),
  }
  signalAttention('ritual', 'Moment', moment.title)
  emit()
}

export function confirmCheckIn(): void {
  if (state.checkInShownAt == null || state.checkInHandled) return
  state = {
    ...state,
    checkInHandled: true,
    checkInShownAt: null,
  }
  clearAttention()
  setBaseTitle(`MVN · ${phaseLabel(state.phase)}`)
  emit()
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
      momentChoiceIds: null,
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
    momentChoiceIds: null,
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
    resumeAfterAfterplay: false,
    northShownKey: null,
  }
  enterActivePhase('sit')
}

export function resetDay(): string {
  const story = buildDayCloseLine(summarizeToday())
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
    resumeAfterAfterplay: false,
    startedAt: null,
    pendingNextPhase: null,
    endedPhase: null,
    currentExerciseId: null,
    currentMotivationId: null,
    ambientMotivationId: null,
    momentChoiceIds: null,
    checkInAt: null,
    checkInShownAt: null,
    checkInHandled: false,
    dayClosedKey: closeKey,
  }
  setBaseTitle('MVN')
  emit()
  return story
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

  if (state.phase === 'pick') {
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
      momentChoiceIds: null,
    }
    setBaseTitle('MVN · Freeze')
    emit()
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
    resumeAfterAfterplay: false,
    momentChoiceIds: null,
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
      checkInAt: null,
      checkInShownAt: null,
      checkInHandled: true,
    }
  }
  setBaseTitle(`MVN · ${phaseLabel(state.phase)}`)
  emit()
}

/** Freeze prompt → short recovery moment, then resume */
export function startFreezeAfterplay(): void {
  if (state.phase !== 'frozen' || !shouldShowFreezePrompt()) return
  if (state.resumeToThreshold) {
    resume()
    return
  }

  const moment = pickMoment(state.mode, state.recentExerciseIds)
  clearAttention()
  state = {
    ...state,
    phase: 'exercise',
    phaseEndsAt: Date.now() + momentMs(),
    phaseDurationMs: momentMs(),
    foreshadowFired: false,
    currentExerciseId: moment.id,
    recentExerciseIds: rememberId(state.recentExerciseIds, moment.id),
    resumeAfterAfterplay: true,
    frozenAt: null,
    freezeExtendUntil: null,
    momentChoiceIds: null,
    momentRerolled: false,
  }
  signalAttention('ritual', 'Nachspiel', moment.title)
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
  skipStanding()
}

export function formatTime(ms: number): string {
  const totalSec = Math.ceil(ms / 1000)
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function isCheckInVisible(): boolean {
  return state.checkInShownAt != null && !state.checkInHandled
}

export function refreshUi(): void {
  emit()
}

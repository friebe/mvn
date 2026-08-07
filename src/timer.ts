import { playBeep, playMomentDone } from './audio'
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
  DEMO_THRESHOLD_MOMENT_MS,
  EXERCISE_MS,
  FORESHADOW_RATIO,
  FREEZE_EXTEND_MS,
  FREEZE_PROMPT_MS,
  THRESHOLD_MOMENT_MS,
  type ActivePhase,
  type AppState,
  type AtmosphereDisplay,
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
import { pickAmbient, pickMotivation, rememberMotivation, shouldShowRareAmbient, ambientMilestoneAfterShow } from './motivation'
import { CHECK_IN_YES_ACTION, notifyPhase, SNOOZE_POSTURE_ACTION } from './notify'
import { isAppAway, subscribePresence } from './presence'
import { buildDayCloseLine, recordStat, summarizeToday, todayKey } from './stats'
import { isLocalDebugHost } from './debug-host'
import { isWalkthroughActive, markWalkthroughSeen, skipWalkthrough } from './walkthrough'
import type { ThemePreference } from './theme'
import { applyTheme } from './theme'

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
/** Re-toast while desk action is waiting and the window is away. */
let awayNudgeId: number | null = null
let awayNudgeKind: AttentionKind | null = null
let awayNudgeTitle = ''
let awayNudgeBody = ''
/** Away re-toasts include a Yes action for mid-phase check-in. */
let awayNudgeCheckIn = false
/** Away re-toasts include +5 min on threshold. */
let awayNudgeSnooze = false
const AWAY_NUDGE_MS = 75_000
const AWAY_ACTION_KINDS: ReadonlySet<AttentionKind> = new Set([
  'threshold',
  'foreshadow',
  'ritual',
])

/** Soft +5 min (same posture) from threshold — max per desk cue chain. */
let postureSnoozeCount = 0
/** Current sit/stand block is a +5 extension (skip sit_done/stand_done on end). */
let phaseIsSnoozeExtension = false
const MAX_POSTURE_SNOOZES = 2
const SNOOZE_MS = 5 * 60_000
const DEMO_SNOOZE_MS = 12_000

/** Localhost-only: freeze wall-clock deadlines for screen debugging. */
let debugPaused = false
let debugPausedRemaining: number | null = null
let debugPausedAt: number | null = null
const pauseListeners = new Set<() => void>()

export function isTimerPaused(): boolean {
  return debugPaused
}

export function subscribeTimerPause(fn: () => void): () => void {
  pauseListeners.add(fn)
  return () => pauseListeners.delete(fn)
}

function emitPauseChange(): void {
  for (const fn of pauseListeners) fn()
}

function shiftDeadlines(deltaMs: number): void {
  if (deltaMs <= 0) return
  state = {
    ...state,
    phaseEndsAt: state.phaseEndsAt != null ? state.phaseEndsAt + deltaMs : null,
    checkInAt: state.checkInAt != null ? state.checkInAt + deltaMs : null,
    checkInShownAt: state.checkInShownAt != null ? state.checkInShownAt + deltaMs : null,
    freezeExtendUntil: state.freezeExtendUntil != null ? state.freezeExtendUntil + deltaMs : null,
    frozenAt: state.frozenAt != null ? state.frozenAt + deltaMs : null,
  }
}

export function setTimerPaused(paused: boolean): void {
  if (!isLocalDebugHost()) return
  if (paused === debugPaused) {
    emit()
    return
  }
  if (paused) {
    debugPaused = true
    debugPausedRemaining = remainingMs()
    debugPausedAt = Date.now()
  } else {
    const delta = Date.now() - (debugPausedAt ?? Date.now())
    shiftDeadlines(delta)
    debugPaused = false
    debugPausedRemaining = null
    debugPausedAt = null
  }
  emitPauseChange()
  emit()
}

export function toggleTimerPaused(): void {
  setTimerPaused(!debugPaused)
}

export function getState(): AppState {
  return state
}

export function subscribe(fn: TimerListener): () => void {
  listeners.push(fn)
  return () => {
    listeners = listeners.filter((l) => l !== fn)
  }
}

/** Last emit fingerprint — skip listeners when nothing visible changed. */
let lastEmit: {
  state: AppState
  fillBucket: number
  showPrompt: boolean
  approaching: boolean
} | null = null

function emit(force = false): void {
  const remaining = remainingMs()
  const showPrompt = shouldShowFreezePrompt()
  const approaching = isApproaching(remaining)
  // Quantize to the tick interval so idle phases (setup/pick/frozen) collapse to one emit.
  const fillBucket = Math.round(remaining / 250)
  if (
    !force &&
    lastEmit &&
    lastEmit.state === state &&
    lastEmit.fillBucket === fillBucket &&
    lastEmit.showPrompt === showPrompt &&
    lastEmit.approaching === approaching
  ) {
    return
  }
  lastEmit = { state, fillBucket, showPrompt, approaching }
  for (const l of listeners) l(state, remaining, showPrompt, approaching)
}

function remainingMs(): number {
  if (debugPaused && debugPausedRemaining != null) {
    return debugPausedRemaining
  }
  if (state.phase === 'frozen') {
    return state.frozenRemainingMs ?? 0
  }
  if (state.phase === 'setup' || state.phase === 'pick') {
    return 0
  }
  if (state.phase === 'threshold') {
    if (state.phaseEndsAt == null) return 0
    return Math.max(0, state.phaseEndsAt - Date.now())
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

function thresholdMomentMs(): number {
  return state.demo ? DEMO_THRESHOLD_MOMENT_MS : THRESHOLD_MOMENT_MS
}

function thresholdMomentChoice(ended: ActivePhase | null = state.endedPhase): boolean {
  // Desk up (sit→stand) and desk down (stand→sit). Legacy reset phase also gets a moment.
  return ended === 'sit' || ended === 'stand' || ended === 'reset'
}

function clearThresholdMomentTimer(): void {
  if (state.phaseEndsAt == null && state.phaseDurationMs == null) return
  state = { ...state, phaseEndsAt: null, phaseDurationMs: null }
}

function autoThresholdToMoment(): void {
  if (state.phase !== 'threshold' || !thresholdMomentChoice()) return
  recordStat('rise')
  clearThresholdMomentTimer()
  resetPostureSnooze()
  enterPick()
}

function shouldShowFreezePrompt(): boolean {
  if (state.phase !== 'frozen' || state.frozenAt == null) return false
  if (state.freezeExtendUntil != null && Date.now() < state.freezeExtendUntil) return false
  return Date.now() - state.frozenAt >= freezePromptMs()
}

export function initTimer(initial: AppState): void {
  bindPresenceOnce()
  // Legacy: desk-confirm phase removed — resume into stand.
  if ((initial.phase as string) === 'confirm') {
    state = { ...initial, phase: 'setup' }
    motivationPickCount = initial.recentMotivationIds.length
    enterActivePhase('stand', { soft: true })
    startTicking()
    return
  }
  state = initial
  motivationPickCount = initial.recentMotivationIds.length
  if (
    state.phase === 'threshold' &&
    state.phaseEndsAt != null &&
    Date.now() >= state.phaseEndsAt &&
    thresholdMomentChoice()
  ) {
    autoThresholdToMoment()
  }
  startTicking()
  emit()
}

let presenceBound = false
function bindPresenceOnce(): void {
  if (presenceBound) return
  presenceBound = true
  subscribePresence((away) => {
    if (!away) clearAwayNudge()
  })
}

function startTicking(): void {
  if (tickId != null) return
  tickId = window.setInterval(() => {
    onTick()
  }, 250)
}

function onTick(): void {
  if (debugPaused) {
    emit()
    return
  }

  if (state.phase === 'setup' || state.phase === 'frozen' || state.phase === 'pick') {
    emit()
    return
  }

  if (state.phase === 'threshold') {
    if (state.phaseEndsAt != null && Date.now() >= state.phaseEndsAt) {
      autoThresholdToMoment()
    }
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
    signalAttention('foreshadow', 'Soon', 'The desk will check in soon.')
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
  signalAttention('foreshadow', 'Check-in', checkInPrompt(), { checkInConfirm: true })
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
  return state.phase === 'stand' ? 'Still standing?' : 'Still at your desk?'
}

function permissionGranted(): boolean {
  return 'Notification' in window && Notification.permission === 'granted'
}

function shouldNotify(muted: boolean, _kind: AttentionKind, _away: boolean): boolean {
  if (state.notificationsEnabled) return true
  return muted && permissionGranted()
}

function clearAwayNudge(): void {
  if (awayNudgeId != null) {
    window.clearInterval(awayNudgeId)
    awayNudgeId = null
  }
  awayNudgeKind = null
  awayNudgeTitle = ''
  awayNudgeBody = ''
  awayNudgeCheckIn = false
  awayNudgeSnooze = false
}

function stillNeedsAwayNudge(): boolean {
  if (state.phase === 'threshold' || state.phase === 'pick' || state.phase === 'exercise') {
    return true
  }
  return state.checkInShownAt != null && !state.checkInHandled
}

function canSnoozePosture(): boolean {
  if (state.phase !== 'threshold') return false
  if (postureSnoozeCount >= MAX_POSTURE_SNOOZES) return false
  const ended = state.endedPhase
  return ended === 'sit' || ended === 'stand'
}

function snoozeDurationMs(): number {
  return state.demo ? DEMO_SNOOZE_MS : SNOOZE_MS
}

function checkInNotifyExtras(): {
  actions: { action: string; title: string }[]
  data: { type: 'check-in' }
} {
  return {
    actions: [{ action: CHECK_IN_YES_ACTION, title: 'Yes' }],
    data: { type: 'check-in' },
  }
}

function snoozeNotifyExtras(): {
  actions: { action: string; title: string }[]
  data: { type: 'threshold-snooze' }
} {
  return {
    actions: [{ action: SNOOZE_POSTURE_ACTION, title: '+5 min' }],
    data: { type: 'threshold-snooze' },
  }
}

function armAwayNudge(
  kind: AttentionKind,
  title: string,
  body: string,
  opts: { checkInConfirm?: boolean; snoozePosture?: boolean } = {},
): void {
  clearAwayNudge()
  if (!AWAY_ACTION_KINDS.has(kind)) return
  awayNudgeKind = kind
  awayNudgeTitle = title
  awayNudgeBody = body
  awayNudgeCheckIn = opts.checkInConfirm === true
  awayNudgeSnooze = opts.snoozePosture === true
  awayNudgeId = window.setInterval(() => {
    if (!isAppAway() || awayNudgeKind == null) return
    if (!stillNeedsAwayNudge()) {
      clearAwayNudge()
      return
    }
    const snooze = awayNudgeSnooze && canSnoozePosture()
    void notifyPhase(`Stint · ${awayNudgeTitle}`, awayNudgeBody, true, {
      persistent: state.notificationPersistent,
      playSound: state.soundEnabled,
      ...(awayNudgeCheckIn ? checkInNotifyExtras() : {}),
      ...(snooze ? snoozeNotifyExtras() : {}),
    })
    startTitleBlink(awayNudgeTitle)
  }, AWAY_NUDGE_MS)
}

function signalAttention(
  kind: AttentionKind,
  title: string,
  body: string,
  opts: { checkInConfirm?: boolean; snoozePosture?: boolean } = {},
): void {
  const muted = !state.soundEnabled
  const away = isAppAway()
  const notify = shouldNotify(muted, kind, away)
  const checkInConfirm = opts.checkInConfirm === true
  const snoozePosture = opts.snoozePosture === true && canSnoozePosture()
  playBeep(state.soundEnabled)
  void notifyPhase(`Stint · ${title}`, body, notify, {
    persistent: state.notificationPersistent,
    playSound: state.soundEnabled || (away && notify),
    ...(checkInConfirm ? checkInNotifyExtras() : {}),
    ...(snoozePosture ? snoozeNotifyExtras() : {}),
  })
  flashShell(kind, muted)

  if (kind === 'threshold') setNeedsAction(true)
  else setNeedsAction(false)

  if ((kind === 'threshold' && muted) || (away && notify && AWAY_ACTION_KINDS.has(kind))) {
    startTitleBlink(title)
  } else {
    stopTitleBlink()
    setBaseTitle(`Stint · ${title}`)
  }

  if (away && notify && AWAY_ACTION_KINDS.has(kind)) {
    armAwayNudge(kind, title, body, { checkInConfirm, snoozePosture })
  } else {
    clearAwayNudge()
  }
}

function clearAttention(): void {
  setNeedsAction(false)
  stopTitleBlink()
  clearAwayNudge()
}

function signalMomentDone(): void {
  playMomentDone(state.soundEnabled)
  flashShell('ritual', !state.soundEnabled)
  setNeedsAction(false)
  stopTitleBlink()
  setBaseTitle('Stint · Moment done')
}

function onPhaseComplete(): void {
  if (state.phase === 'exercise') {
    clearAttention()
    signalMomentDone()

    if (state.resumeAfterAfterplay) {
      finishAfterplay()
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
  setBaseTitle(`Stint · ${phaseLabel(phase)}`)
  emit()
}

function enterThreshold(ended: ActivePhase): void {
  const next = nextActivePhase(ended)
  if (!phaseIsSnoozeExtension) {
    if (ended === 'sit') recordStat('sit_done')
    else if (ended === 'stand') recordStat('stand_done')
    else recordStat('reset_done')
    postureSnoozeCount = 0
  }
  phaseIsSnoozeExtension = false

  const momentChoice = thresholdMomentChoice(ended)
  const duration = momentChoice ? thresholdMomentMs() : null

  state = {
    ...state,
    phase: 'threshold',
    phaseEndsAt: momentChoice ? Date.now() + duration! : null,
    phaseDurationMs: duration,
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
    'Desk',
    ended === 'sit' ? 'Desk wants up.' : 'Sit again?',
    { snoozePosture: true },
  )
  emit()
}

function resetPostureSnooze(): void {
  postureSnoozeCount = 0
  phaseIsSnoozeExtension = false
}

/** Threshold toast / in-app: stay in current posture +5 min (deep work). */
export function snoozePosture(): void {
  if (!canSnoozePosture()) return
  const phase = state.endedPhase
  if (phase !== 'sit' && phase !== 'stand') return

  postureSnoozeCount += 1
  clearThresholdMomentTimer()
  clearAttention()

  const ms = snoozeDurationMs()
  phaseIsSnoozeExtension = true
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
    ambientMotivationId: null,
    resumeToThreshold: false,
    resumeAfterAfterplay: false,
    momentChoiceIds: null,
    checkInAt: null,
    checkInShownAt: null,
    checkInHandled: true,
  }
  setBaseTitle(`Stint · ${phaseLabel(phase)} · +5`)
  emit()
}

export function canSnoozePostureNow(): boolean {
  return canSnoozePosture()
}

function enterPick(): void {
  const cards = pickMomentCards(state.recentExerciseIds)
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
  signalAttention('ritual', 'Moment', 'Three cards. One is enough.')
  emit()
}

function enterRitualWithMoment(momentId: string): void {
  const moment = getMoment(momentId) ?? pickMoment(state.recentExerciseIds)
  const next = state.pendingNextPhase ?? 'sit'
  motivationPickCount += 1
  const motivation = pickMotivation(state.recentMotivationIds, motivationPickCount)

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
  const ms = durationFor(phase, state.demo, state.intervals)
  const day = todayKey()
  let ambientId: string | null = null
  let recentMot = state.recentMotivationIds
  let northKey = state.northShownKey

  let ambientMilestone = state.ambientMilestone

  if (phase === 'sit') {
    const confirmed = summarizeToday().desk_confirmed
    const now = new Date()
    if (shouldShowRareAmbient(confirmed, ambientMilestone, northKey, now)) {
      const ambient = pickAmbient(recentMot, now)
      ambientId = ambient.id
      recentMot = rememberMotivation(recentMot, ambient.id)
      northKey = day
      ambientMilestone = ambientMilestoneAfterShow(confirmed)
    }
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
    ambientMilestone,
    resumeToThreshold: false,
    resumeAfterAfterplay: false,
    momentChoiceIds: null,
    checkInAt:
      phase === 'sit' || phase === 'stand' ? Date.now() + ms * CHECKIN_RATIO : null,
    checkInShownAt: null,
    checkInHandled: false,
  }

  if (opts.soft) {
    setBaseTitle(`Stint · ${phaseLabel(phase)}`)
  } else {
    signalAttention('phase', phaseLabel(phase), formatDurationHint(ms, state.demo))
  }
  emit()
}

/** Threshold → next phase without moment (or after skip). */
function advanceThresholdNext(): void {
  clearThresholdMomentTimer()
  clearAttention()
  resetPostureSnooze()
  enterActivePhase(state.pendingNextPhase ?? 'sit', { soft: true })
}

/** Threshold primary — moment on desk up and desk down. */
export function chooseRise(): void {
  if (state.phase !== 'threshold') return
  if (!thresholdMomentChoice()) {
    advanceThresholdNext()
    return
  }
  recordStat('rise')
  clearThresholdMomentTimer()
  resetPostureSnooze()
  enterPick()
}

export function chooseMoment(momentId: string): void {
  if (state.phase !== 'pick') return
  if (!state.momentChoiceIds?.includes(momentId)) return
  recordStat('ritual_done')
  enterRitualWithMoment(momentId)
}

/** Skip ritual — at threshold (direct) or after opening the moment pick. */
export function skipStanding(): void {
  if (state.phase === 'threshold') {
    if (!thresholdMomentChoice()) return
    recordStat('ritual_skip')
    advanceThresholdNext()
    return
  }
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
  enterActivePhase(next, { soft: true })
}

export function completeMoment(): void {
  if (state.phase !== 'exercise') return
  state = { ...state, phaseEndsAt: Date.now() }
  onPhaseComplete()
}

export function rerollMoment(): void {
  if (state.phase !== 'exercise' || state.momentRerolled) return
  const moment = pickMoment(state.recentExerciseIds)
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
  // Mid-phase Yes (sit or stand) = presence confirmed for the day.
  recordStat('desk_confirmed')
  state = {
    ...state,
    checkInHandled: true,
    checkInShownAt: null,
  }
  clearAttention()
  setBaseTitle(`Stint · ${phaseLabel(state.phase)}`)
  emit()
}

export function startDay(): void {
  recordStat('day_start')
  resetPostureSnooze()
  if (isWalkthroughActive()) skipWalkthrough()
  else markWalkthroughSeen()
  state = {
    ...state,
    startedAt: Date.now(),
    frozenAt: null,
    frozenRemainingMs: null,
    freezeExtendUntil: null,
    frozenPhase: null,
    resumeToThreshold: false,
    resumeAfterAfterplay: false,
    northShownKey: null,
    ambientMilestone: 0,
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
  resetPostureSnooze()
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
    northShownKey: null,
    ambientMilestone: 0,
  }
  setBaseTitle('Stint')
  emit()
  return story
}

export function setAtmosphereDisplay(display: AtmosphereDisplay): void {
  if (state.atmosphereDisplay === display) return
  state = { ...state, atmosphereDisplay: display }
  emit()
}

export function setTheme(theme: ThemePreference): void {
  if (state.theme === theme) return
  state = { ...state, theme }
  applyTheme(theme)
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
  setSoundEnabled(!state.soundEnabled)
}

export function setSoundEnabled(enabled: boolean): void {
  state = { ...state, soundEnabled: enabled }
  emit()
}

export function setNotificationsEnabled(enabled: boolean): void {
  state = { ...state, notificationsEnabled: enabled }
  emit()
}

export function freeze(): void {
  if (state.phase === 'frozen' || state.phase === 'setup') return
  if (state.phase !== 'sit' && state.phase !== 'stand' && state.phase !== 'reset') {
    return
  }

  recordStat('freeze_manual')

  const rem = remainingMs()
  const frozenPhase: ActivePhase = state.phase

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
  setBaseTitle('Stint · Freeze')
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
  setBaseTitle(`Stint · ${phaseLabel(state.phase)}`)
  emit()
}

/** Freeze prompt → short recovery moment, then resume */
export function startFreezeAfterplay(): void {
  if (state.phase !== 'frozen' || !shouldShowFreezePrompt()) return
  if (state.resumeToThreshold) {
    resume()
    return
  }

  const moment = pickMoment(state.recentExerciseIds)
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
  signalAttention('ritual', 'Cooldown', moment.title)
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
  emit(true)
}

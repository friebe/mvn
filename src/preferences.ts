import { loadState, saveState, type AppState } from './state'
import type { UserIntervals } from './intervals'
import { normalizeStoredIntervals, resolveIntervals } from './intervals'
import { buildDayCloseLine, recordStat, summarizeToday, todayKey } from './stats'

export type PreferenceKey =
  | 'soundEnabled'
  | 'notificationsEnabled'
  | 'demo'
  | 'mode'
  | 'intervals'
  | 'shortcutHintsEnabled'
  | 'notificationPersistent'

export function readPreferences(): AppState {
  return loadState()
}

export function writePreferences(patch: Partial<Pick<AppState, PreferenceKey>>): AppState {
  const next = { ...loadState(), ...patch }
  saveState(next)
  return next
}

export function togglePreference(
  key: 'soundEnabled' | 'notificationsEnabled' | 'demo' | 'shortcutHintsEnabled' | 'notificationPersistent',
): AppState {
  const state = loadState()
  return writePreferences({ [key]: !state[key] })
}

export function setIntervals(intervals: UserIntervals): AppState {
  const next = { ...loadState(), intervals: normalizeStoredIntervals(intervals) }
  saveState(next)
  return next
}

export function getResolvedIntervals(): UserIntervals {
  return resolveIntervals(loadState().intervals)
}

export function closeDayInStorage(): { state: AppState; story: string } {
  const state = loadState()
  const closeKey = todayKey()
  const story = buildDayCloseLine(summarizeToday())
  if (state.dayClosedKey !== closeKey) {
    recordStat('day_close')
  }
  const next: AppState = {
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
  saveState(next)
  return { state: next, story }
}

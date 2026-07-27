import type { UserIntervals } from './intervals'

export type EnergyMode = 'high' | 'lazy'
export type ActivePhase = 'sit' | 'stand' | 'reset'
export type Phase =
  | ActivePhase
  | 'threshold'
  | 'confirm'
  | 'exercise'
  | 'frozen'
  | 'closing'
  | 'setup'

export interface AppState {
  mode: EnergyMode
  /** Short intervals for testing the full loop quickly */
  demo: boolean
  phase: Phase
  /** Full duration of current timed phase (for foreshadow at ~10%) */
  phaseDurationMs: number | null
  /** Soft warning already fired for this phase */
  foreshadowFired: boolean
  /** Wall-clock end of current countdown phase (sit/stand/reset/exercise) */
  phaseEndsAt: number | null
  /** Remaining ms of interrupted phase while frozen */
  frozenRemainingMs: number | null
  /** When freeze started */
  frozenAt: number | null
  /** If set, suppress "Call vorbei?" until this timestamp */
  freezeExtendUntil: number | null
  /** Phase that was interrupted by freeze */
  frozenPhase: ActivePhase | null
  /** Resume back into threshold choice after freeze */
  resumeToThreshold: boolean
  /** Resume back into desk-confirm after freeze */
  resumeToConfirm: boolean
  soundEnabled: boolean
  notificationsEnabled: boolean
  recentMotivationIds: string[]
  recentExerciseIds: string[]
  startedAt: number | null
  /** Quiet why-line during sit/stand (not an alert) */
  ambientMotivationId: string | null
  /** Current exercise/motivation shown in ritual */
  currentExerciseId: string | null
  currentMotivationId: string | null
  /** Which active phase just ended (threshold/confirm context) */
  endedPhase: ActivePhase | null
  /** Next phase after ritual / lazy skip */
  pendingNextPhase: ActivePhase | null
  /** Day already closed today (ISO date key) */
  dayClosedKey: string | null
  /** Custom sit/stand/reset durations; null = defaults */
  intervals: UserIntervals | null
}

export const STORAGE_KEY = 'mvn.v1'
export const FREEZE_PROMPT_MS = 30 * 60 * 1000
export const FREEZE_EXTEND_MS = 15 * 60 * 1000
export const EXERCISE_MS = 60 * 1000
/** Soft foreshadow when this fraction of the phase remains */
export const FORESHADOW_RATIO = 0.1

export function defaultState(): AppState {
  return {
    mode: 'high',
    demo: false,
    phase: 'setup',
    phaseDurationMs: null,
    foreshadowFired: false,
    phaseEndsAt: null,
    frozenRemainingMs: null,
    frozenAt: null,
    freezeExtendUntil: null,
    frozenPhase: null,
    resumeToThreshold: false,
    resumeToConfirm: false,
    soundEnabled: false,
    notificationsEnabled: false,
    recentMotivationIds: [],
    recentExerciseIds: [],
    startedAt: null,
    ambientMotivationId: null,
    currentExerciseId: null,
    currentMotivationId: null,
    endedPhase: null,
    pendingNextPhase: null,
    dayClosedKey: null,
    intervals: null,
  }
}

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaultState()
    const parsed = JSON.parse(raw) as Partial<AppState>
    return { ...defaultState(), ...parsed }
  } catch {
    return defaultState()
  }
}

export function saveState(state: AppState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

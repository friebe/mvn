export type EnergyMode = 'high' | 'lazy'
export type ActivePhase = 'sit' | 'stand' | 'reset'
export type Phase = ActivePhase | 'exercise' | 'frozen' | 'setup'

export interface AppState {
  mode: EnergyMode
  phase: Phase
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
  soundEnabled: boolean
  notificationsEnabled: boolean
  recentMotivationIds: string[]
  recentExerciseIds: string[]
  startedAt: number | null
  /** Current exercise/motivation shown in overlay */
  currentExerciseId: string | null
  currentMotivationId: string | null
  /** Before exercise: which active phase just ended (for next phase) */
  pendingNextPhase: ActivePhase | null
}

export const STORAGE_KEY = 'mvn.v1'
export const FREEZE_PROMPT_MS = 30 * 60 * 1000
export const FREEZE_EXTEND_MS = 15 * 60 * 1000
export const EXERCISE_MS = 60 * 1000

export function defaultState(): AppState {
  return {
    mode: 'high',
    phase: 'setup',
    phaseEndsAt: null,
    frozenRemainingMs: null,
    frozenAt: null,
    freezeExtendUntil: null,
    frozenPhase: null,
    soundEnabled: true,
    notificationsEnabled: false,
    recentMotivationIds: [],
    recentExerciseIds: [],
    startedAt: null,
    currentExerciseId: null,
    currentMotivationId: null,
    pendingNextPhase: null,
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

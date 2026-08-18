import { migrateIntervals, type UserIntervals } from './intervals'
import type { ThemePreference } from './theme'
import { normalizeTheme } from './theme'
import {
  ATMOSPHERE_WORDS_HIDDEN_KEY,
  STATE_KEY,
} from './storage-keys'

/** Atmosphere headline: soft words, timer, percent, or progress bar only */
export type AtmosphereDisplay = 'soft' | 'clock' | 'percent' | 'bar'
export type ActivePhase = 'sit' | 'stand' | 'reset'
export type Phase =
  | ActivePhase
  | 'threshold'
  | 'pick'
  | 'exercise'
  | 'frozen'
  | 'closing'
  | 'setup'

export interface AppState {
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
  /** Full duration of the interrupted sit/stand block (restore after cooldown) */
  frozenDurationMs: number | null
  /** When freeze started */
  frozenAt: number | null
  /** If set, suppress "Call vorbei?" until this timestamp */
  freezeExtendUntil: number | null
  /** Phase that was interrupted by freeze */
  frozenPhase: ActivePhase | null
  /** Resume back into threshold choice after freeze */
  resumeToThreshold: boolean
  /** After freeze afterplay moment, resume interrupted phase */
  resumeAfterAfterplay: boolean
  soundEnabled: boolean
  notificationsEnabled: boolean
  recentMotivationIds: string[]
  recentExerciseIds: string[]
  startedAt: number | null
  /** Quiet why-line during sit/stand (not an alert) */
  ambientMotivationId: string | null
  /** Current moment / motivation shown in ritual */
  currentExerciseId: string | null
  currentMotivationId: string | null
  /** Three moment cards at pick phase */
  momentChoiceIds: string[] | null
  /** Already used "Anderer Moment" once */
  momentRerolled: boolean
  /** Soft check-in due at this timestamp (stand mid-phase only) */
  checkInAt: number | null
  /** Check-in visible since */
  checkInShownAt: number | null
  /** Check-in answered or dismissed for this phase */
  checkInHandled: boolean
  /** Which active phase just ended (threshold context) */
  endedPhase: ActivePhase | null
  /** Next phase after ritual / skip */
  pendingNextPhase: ActivePhase | null
  /** Day already closed today (ISO date key) */
  dayClosedKey: string | null
  /** Custom sit/stand/reset durations; null = defaults */
  intervals: UserIntervals | null
  /** Nordstern line already shown today */
  northShownKey: string | null
  /** desk_confirmed count at last milestone ambient line */
  ambientMilestone: number
  /** Show keyboard hints on action buttons */
  shortcutHintsEnabled: boolean
  /** Keep OS toast visible until dismissed (requireInteraction) */
  notificationPersistent: boolean
  /** Main stage atmosphere display mode */
  atmosphereDisplay: AtmosphereDisplay
  /** Desk Daylight / Desk Evening / follow OS */
  theme: ThemePreference
}

export const STORAGE_KEY = STATE_KEY
export const FREEZE_PROMPT_MS = 30 * 60 * 1000
export const FREEZE_EXTEND_MS = 15 * 60 * 1000
/** Micro-moment duration (was 60s exercise) */
export const EXERCISE_MS = 15 * 1000
export const MOMENT_MS = EXERCISE_MS
/** Soft foreshadow when this fraction of the phase remains */
export const FORESHADOW_RATIO = 0.1
/** Mid-phase soft check-in */
export const CHECKIN_RATIO = 0.5
/** Auto-advance to moment pick at threshold unless user opts out */
export const THRESHOLD_MOMENT_MS = 15 * 1000
export const DEMO_THRESHOLD_MOMENT_MS = 5 * 1000
/** Same 15s beat as moment / threshold — ignore it and it is not proof */
export const CHECKIN_TIMEOUT_MS = THRESHOLD_MOMENT_MS
export const DEMO_CHECKIN_TIMEOUT_MS = DEMO_THRESHOLD_MOMENT_MS

function migrateAtmosphereDisplay(parsed: Partial<AppState>): AtmosphereDisplay {
  if (
    parsed.atmosphereDisplay === 'soft' ||
    parsed.atmosphereDisplay === 'clock' ||
    parsed.atmosphereDisplay === 'percent' ||
    parsed.atmosphereDisplay === 'bar'
  ) {
    return parsed.atmosphereDisplay
  }
  try {
    if (localStorage.getItem(ATMOSPHERE_WORDS_HIDDEN_KEY) === '1') return 'bar'
  } catch {
    // ignore
  }
  return 'clock'
}

export function defaultState(): AppState {
  return {
    demo: false,
    phase: 'setup',
    phaseDurationMs: null,
    foreshadowFired: false,
    phaseEndsAt: null,
    frozenRemainingMs: null,
    frozenDurationMs: null,
    frozenAt: null,
    freezeExtendUntil: null,
    frozenPhase: null,
    resumeToThreshold: false,
    resumeAfterAfterplay: false,
    soundEnabled: false,
    notificationsEnabled: false,
    recentMotivationIds: [],
    recentExerciseIds: [],
    startedAt: null,
    ambientMotivationId: null,
    currentExerciseId: null,
    currentMotivationId: null,
    momentChoiceIds: null,
    momentRerolled: false,
    checkInAt: null,
    checkInShownAt: null,
    checkInHandled: false,
    endedPhase: null,
    pendingNextPhase: null,
    dayClosedKey: null,
    intervals: null,
    northShownKey: null,
    ambientMilestone: 0,
    shortcutHintsEnabled: true,
    notificationPersistent: false,
    atmosphereDisplay: 'clock',
    theme: 'system',
  }
}

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STATE_KEY)
    if (!raw) return defaultState()
    const parsed = JSON.parse(raw) as Partial<AppState> & {
      mode?: string
      intervals?: unknown
    }
    const { mode: legacyMode, intervals: rawIntervals, ...rest } = parsed
    return {
      ...defaultState(),
      ...rest,
      intervals: migrateIntervals(rawIntervals, legacyMode),
      atmosphereDisplay: migrateAtmosphereDisplay(parsed),
      theme: normalizeTheme(parsed.theme),
    }
  } catch {
    return defaultState()
  }
}

export function saveState(state: AppState): void {
  localStorage.setItem(STATE_KEY, JSON.stringify(state))
}

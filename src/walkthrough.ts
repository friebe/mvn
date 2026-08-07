import { pickMomentCards } from './exercises'
import { FORESHADOW_RATIO } from './state'
import { WALKTHROUGH_SEEN_KEY } from './storage-keys'

export type WalkthroughStepId = 'sit' | 'cues' | 'threshold' | 'moment' | 'stand' | 'done'

export type WalkthroughLayout = 'copy' | 'cues' | 'threshold' | 'pick'

export interface WalkthroughStep {
  id: WalkthroughStepId
  layout: WalkthroughLayout
  /** Matches shell phase styling where useful */
  phase: 'sit' | 'threshold' | 'pick' | 'stand' | 'setup'
  kicker: string
  lead: string
  sub: string
  /** Soft atmosphere word when not draining (or ·) */
  atmosphere: string
  /** Static fill when not animating a sit/stand drain */
  fill: number
  /** Coach line under progress on interactive steps */
  coach?: string
}

/** Live sit/stand atmosphere during the tour (drains like a real phase). */
export interface WalkthroughAtmosphere {
  fill: number
  approaching: boolean
  timed: boolean
  /** Synthetic remaining/duration for softTimeLabel */
  remainingMs: number
  durationMs: number
}

const STEPS: readonly WalkthroughStep[] = [
  {
    id: 'sit',
    layout: 'copy',
    phase: 'sit',
    kicker: 'Sit',
    lead: 'Long sit blocks.',
    sub: 'Watch the glow shrink — same quiet atmosphere as a real day.',
    atmosphere: 'settling in',
    fill: 1,
  },
  {
    id: 'cues',
    layout: 'cues',
    phase: 'setup',
    kicker: 'Cues',
    lead: 'Sound and toasts.',
    sub: 'Optional — a soft beep and a browser toast when the desk wants a switch. Best on a second monitor.',
    atmosphere: '·',
    fill: 0,
    coach: 'Enable what you want — then Next to hear a sample desk cue.',
  },
  {
    id: 'threshold',
    layout: 'threshold',
    phase: 'threshold',
    kicker: 'Desk',
    lead: 'Desk wants up.',
    sub: 'This is the switch cue — tap Move briefly when the desk is ready.',
    atmosphere: '·',
    fill: 1,
    coach: 'When the desk cue appears, you’d tap Move briefly.',
  },
  {
    id: 'moment',
    layout: 'pick',
    phase: 'pick',
    kicker: 'Moment',
    lead: 'Three cards. One is enough.',
    sub: 'Pick a micro-move — or skip and just stand.',
    atmosphere: '·',
    fill: 0,
    coach: 'Three example moments — pick one in a real day.',
  },
  {
    id: 'stand',
    layout: 'copy',
    phase: 'stand',
    kicker: 'Stand',
    lead: 'Short stand, then sit again.',
    sub: 'Color shifts, glow drains again — then back to sit.',
    atmosphere: 'on your feet',
    fill: 1,
  },
  {
    id: 'done',
    layout: 'copy',
    phase: 'setup',
    kicker: 'That’s the loop',
    lead: 'Sit · micro-move · stand.',
    sub: 'Ready when you are — Start begins your real day.',
    atmosphere: '·',
    fill: 0,
  },
]

/** Compressed sit/stand so the shrink reads clearly (faster than demo, not a slideshow). */
const SIT_DRAIN_MS = 4_200
const STAND_DRAIN_MS = 3_600
const AUTO_COPY_MS = 4_000
const AUTO_INTERACTIVE_MS = 10_000
const FILL_EMIT_MS = 50

type Listener = () => void
type EnterListener = (step: WalkthroughStep) => void

let stepIndex: number | null = null
let autoId: number | null = null
let drainRaf: number | null = null
let liveAtmo: WalkthroughAtmosphere | null = null
let lastFillEmitAt = 0
/** Sample cards for the pick step (real UI). */
let momentChoiceIds: string[] | null = null
const listeners = new Set<Listener>()
const enterListeners = new Set<EnterListener>()

function emit(): void {
  for (const fn of listeners) fn()
}

function emitEnter(step: WalkthroughStep): void {
  for (const fn of enterListeners) fn(step)
}

function clearAuto(): void {
  if (autoId != null) {
    window.clearTimeout(autoId)
    autoId = null
  }
}

function clearDrain(): void {
  if (drainRaf != null) {
    window.cancelAnimationFrame(drainRaf)
    drainRaf = null
  }
  liveAtmo = null
}

function drainDurationFor(step: WalkthroughStep): number | null {
  if (step.phase === 'sit') return SIT_DRAIN_MS
  if (step.phase === 'stand') return STAND_DRAIN_MS
  return null
}

function setLiveFill(fill: number, durationMs: number, timed: boolean): void {
  const clamped = Math.max(0.05, Math.min(1, fill))
  liveAtmo = {
    fill: clamped,
    approaching: timed && clamped <= FORESHADOW_RATIO,
    timed,
    remainingMs: clamped * durationMs,
    durationMs,
  }
}

function startDrain(durationMs: number): void {
  clearDrain()
  const started = performance.now()
  setLiveFill(1, durationMs, true)
  lastFillEmitAt = 0

  const tick = (now: number) => {
    const t = Math.min(1, (now - started) / durationMs)
    // Ease-out so the last stretch (approaching) lingers a beat.
    const eased = 1 - (1 - t) ** 1.35
    setLiveFill(1 - eased * 0.95, durationMs, true)
    if (now - lastFillEmitAt >= FILL_EMIT_MS || t >= 1) {
      lastFillEmitAt = now
      emit()
    }
    if (t < 1) {
      drainRaf = window.requestAnimationFrame(tick)
      return
    }
    drainRaf = null
    // Hold the near-empty glow briefly, then advance — atmosphere ends the beat.
    autoId = window.setTimeout(() => {
      nextWalkthroughStep()
    }, 420)
  }

  drainRaf = window.requestAnimationFrame(tick)
}

function armAuto(): void {
  clearAuto()
  if (stepIndex == null) return
  if (stepIndex >= STEPS.length - 1) return
  const step = STEPS[stepIndex]
  if (!step) return
  // Sit/stand advance when drain finishes.
  if (drainDurationFor(step) != null) return
  // Cues waits for an explicit Next — permission UI.
  if (step.layout === 'cues') return
  const ms = step.layout === 'copy' ? AUTO_COPY_MS : AUTO_INTERACTIVE_MS
  autoId = window.setTimeout(() => {
    nextWalkthroughStep()
  }, ms)
}

function prepareStep(index: number): void {
  const step = STEPS[index]
  if (!step) return
  clearDrain()
  clearAuto()

  if (step.layout === 'pick') {
    momentChoiceIds = pickMomentCards([]).map((m) => m.id)
  } else {
    momentChoiceIds = null
  }

  const drainMs = drainDurationFor(step)
  if (drainMs != null) {
    startDrain(drainMs)
  } else {
    liveAtmo = {
      fill: step.fill,
      approaching: false,
      timed: false,
      remainingMs: 0,
      durationMs: 1,
    }
  }

  emitEnter(step)
}

export function subscribeWalkthrough(fn: Listener): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

/** Fired when a step becomes active (e.g. sample desk cue on threshold). */
export function subscribeWalkthroughEnter(fn: EnterListener): () => void {
  enterListeners.add(fn)
  return () => enterListeners.delete(fn)
}

export function hasSeenWalkthrough(): boolean {
  try {
    return localStorage.getItem(WALKTHROUGH_SEEN_KEY) === '1'
  } catch {
    return true
  }
}

export function markWalkthroughSeen(): void {
  try {
    localStorage.setItem(WALKTHROUGH_SEEN_KEY, '1')
  } catch {
    // ignore
  }
}

/** Offer “Try the loop” on Ready when not yet seen. */
export function shouldOfferWalkthrough(): boolean {
  return !hasSeenWalkthrough() && stepIndex == null
}

export function isWalkthroughActive(): boolean {
  return stepIndex != null
}

export function getWalkthroughStep(): WalkthroughStep | null {
  if (stepIndex == null) return null
  return STEPS[stepIndex] ?? null
}

export function getWalkthroughAtmosphere(): WalkthroughAtmosphere | null {
  if (stepIndex == null) return null
  return liveAtmo
}

export function getWalkthroughMomentIds(): string[] | null {
  return momentChoiceIds
}

export function getWalkthroughProgress(): { index: number; total: number } | null {
  if (stepIndex == null) return null
  return { index: stepIndex, total: STEPS.length }
}

/** @param force replay from Settings even if already seen */
export function startWalkthrough(force = false): void {
  if (!force && hasSeenWalkthrough()) return
  if (stepIndex != null) return
  stepIndex = 0
  prepareStep(0)
  armAuto()
  emit()
}

export function nextWalkthroughStep(): void {
  if (stepIndex == null) return
  if (stepIndex >= STEPS.length - 1) {
    finishWalkthrough()
    return
  }
  stepIndex += 1
  prepareStep(stepIndex)
  armAuto()
  emit()
}

export function skipWalkthrough(): void {
  if (stepIndex == null) return
  clearAuto()
  clearDrain()
  stepIndex = null
  momentChoiceIds = null
  cueFeedback = null
  markWalkthroughSeen()
  emit()
}

export function finishWalkthrough(): void {
  if (stepIndex == null) return
  clearAuto()
  clearDrain()
  stepIndex = null
  momentChoiceIds = null
  cueFeedback = null
  markWalkthroughSeen()
  emit()
}

export function isLastWalkthroughStep(): boolean {
  return stepIndex != null && stepIndex >= STEPS.length - 1
}

let cueFeedback: string | null = null

export function setWalkthroughCueFeedback(message: string | null): void {
  cueFeedback = message
}

export function getWalkthroughCueFeedback(): string | null {
  return cueFeedback
}

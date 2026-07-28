/** Soft progress labels — no exam-clock pressure. */

export type AtmosphereStage = 'full' | 'plenty' | 'mid' | 'low' | 'near'

export function remainingRatio(remainingMs: number, durationMs: number | null): number {
  if (!durationMs || durationMs <= 0) return 0
  return Math.max(0, Math.min(1, remainingMs / durationMs))
}

/** Fill level 0–1 for the atmosphere bar (empties as time passes). */
export function fillLevel(remainingMs: number, durationMs: number | null): number {
  return remainingRatio(remainingMs, durationMs)
}

export function atmosphereStage(ratio: number): AtmosphereStage {
  if (ratio > 0.7) return 'full'
  if (ratio > 0.4) return 'plenty'
  if (ratio > 0.2) return 'mid'
  if (ratio > 0.1) return 'low'
  return 'near'
}

export function softTimeLabel(
  remainingMs: number,
  durationMs: number | null,
  approaching: boolean,
): string {
  if (approaching) return 'soon'
  const stage = atmosphereStage(remainingRatio(remainingMs, durationMs))
  switch (stage) {
    case 'full':
      return 'plenty of room'
    case 'plenty':
      return 'still a stretch'
    case 'mid':
      return 'halfway'
    case 'low':
      return 'almost'
    case 'near':
      return 'soon'
  }
}

export function formatExactTime(ms: number): string {
  const totalSec = Math.max(0, Math.ceil(ms / 1000))
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

/** Remaining share of the current phase, 0–100 %. */
export function formatRemainingPercent(remainingMs: number, durationMs: number | null): string {
  if (!durationMs || durationMs <= 0) return '—'
  const pct = Math.max(0, Math.min(100, Math.round(remainingRatio(remainingMs, durationMs) * 100)))
  return `${pct}%`
}

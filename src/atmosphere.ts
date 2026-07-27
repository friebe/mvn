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
  if (approaching) return 'gleich'
  const stage = atmosphereStage(remainingRatio(remainingMs, durationMs))
  switch (stage) {
    case 'full':
      return 'noch viel Luft'
    case 'plenty':
      return 'noch ein Stück'
    case 'mid':
      return 'halbwegs'
    case 'low':
      return 'bald'
    case 'near':
      return 'gleich'
  }
}

export function formatExactTime(ms: number): string {
  const totalSec = Math.max(0, Math.ceil(ms / 1000))
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

let ctx: AudioContext | null = null

function getCtx(): AudioContext {
  if (!ctx) ctx = new AudioContext()
  return ctx
}

function playTone(
  ac: AudioContext,
  freq: number,
  startAt: number,
  duration: number,
  peak = 0.14,
): void {
  const osc = ac.createOscillator()
  const gain = ac.createGain()
  osc.type = 'sine'
  osc.frequency.value = freq
  gain.gain.value = 0.0001
  osc.connect(gain)
  gain.connect(ac.destination)
  gain.gain.exponentialRampToValueAtTime(peak, startAt + 0.025)
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration)
  osc.start(startAt)
  osc.stop(startAt + duration + 0.02)
}

/** Short oscillator beep — no media files. */
export function playBeep(enabled: boolean): void {
  if (!enabled) return
  try {
    const ac = getCtx()
    void ac.resume()
    playTone(ac, 660, ac.currentTime, 0.35, 0.12)
  } catch {
    // Audio may be blocked until user gesture — silent fail
  }
}

/**
 * Soft two-note “done” chime when a micro-moment ends —
 * meant to be heard if you stepped away (window, stretch).
 */
export function playMomentDone(enabled: boolean): void {
  if (!enabled) return
  try {
    const ac = getCtx()
    void ac.resume()
    const now = ac.currentTime
    playTone(ac, 523.25, now, 0.42, 0.16)
    playTone(ac, 659.25, now + 0.2, 0.55, 0.18)
  } catch {
    // Audio may be blocked until user gesture — silent fail
  }
}

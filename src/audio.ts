let ctx: AudioContext | null = null

function getCtx(): AudioContext {
  if (!ctx) ctx = new AudioContext()
  return ctx
}

/** Short oscillator beep — no media files. */
export function playBeep(enabled: boolean): void {
  if (!enabled) return
  try {
    const ac = getCtx()
    void ac.resume()
    const osc = ac.createOscillator()
    const gain = ac.createGain()
    osc.type = 'sine'
    osc.frequency.value = 660
    gain.gain.value = 0.0001
    osc.connect(gain)
    gain.connect(ac.destination)
    const now = ac.currentTime
    gain.gain.exponentialRampToValueAtTime(0.12, now + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35)
    osc.start(now)
    osc.stop(now + 0.4)
  } catch {
    // Audio may be blocked until user gesture — silent fail
  }
}

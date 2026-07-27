/** Visual attention when sound is muted — second-monitor catch. */

let titleBlinkId: number | null = null
let baseTitle = 'MVN'
let flashClearId: number | null = null

export type AttentionKind = 'foreshadow' | 'threshold' | 'ritual' | 'phase'

function shellEl(): HTMLElement | null {
  return document.querySelector('.shell')
}

export function setBaseTitle(title: string): void {
  baseTitle = title
  if (titleBlinkId == null) document.title = title
}

export function stopTitleBlink(): void {
  if (titleBlinkId != null) {
    window.clearInterval(titleBlinkId)
    titleBlinkId = null
  }
  document.title = baseTitle
}

/** Persistent title blink until stop — for threshold while muted. */
export function startTitleBlink(label: string): void {
  stopTitleBlink()
  baseTitle = `MVN · ${label}`
  let on = true
  document.title = `● ${baseTitle}`
  titleBlinkId = window.setInterval(() => {
    on = !on
    document.title = on ? `● ${baseTitle}` : `○ ${baseTitle}`
  }, 900)
}

/** One-shot full-shell flash. Stronger when muted. */
export function flashShell(kind: AttentionKind, muted: boolean): void {
  const shell = shellEl()
  if (!shell) return
  shell.dataset.attention = kind
  shell.dataset.attentionMuted = muted ? 'true' : 'false'
  if (flashClearId != null) window.clearTimeout(flashClearId)
  const ms = muted ? 1800 : 900
  flashClearId = window.setTimeout(() => {
    if (shell.dataset.attention === kind) {
      delete shell.dataset.attention
      delete shell.dataset.attentionMuted
    }
    flashClearId = null
  }, ms)
}

export function setNeedsAction(active: boolean): void {
  const shell = shellEl()
  if (!shell) return
  if (active) shell.dataset.needsAction = 'true'
  else delete shell.dataset.needsAction
}

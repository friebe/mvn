/** Visual attention when sound is muted — second-monitor catch. */

let titleBlinkId: number | null = null
let baseTitle = 'Stint'

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
  baseTitle = `Stint · ${label}`
  let on = true
  document.title = `● ${baseTitle}`
  titleBlinkId = window.setInterval(() => {
    on = !on
    document.title = on ? `● ${baseTitle}` : `○ ${baseTitle}`
  }, 900)
}

/** One-shot full-shell flash — disabled; hue shift on .shell::before is enough. */
export function flashShell(_kind: AttentionKind, _muted: boolean): void {
  // no-op: edge pulse removed
}

export function setNeedsAction(active: boolean): void {
  const shell = shellEl()
  if (!shell) return
  if (active) shell.dataset.needsAction = 'true'
  else delete shell.dataset.needsAction
}

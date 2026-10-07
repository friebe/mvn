/** Game-style pack unlock — border sweep, label orbits, then caller navigates. */

const CEREMONY_MS = 1480
const CEREMONY_MS_REDUCED = 520

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function ensureCeremonyRoot(): HTMLElement {
  let root = document.getElementById('moments-unlock-ceremony')
  if (root) return root

  root = document.createElement('div')
  root.id = 'moments-unlock-ceremony'
  root.className = 'moments-unlock-ceremony'
  root.hidden = true
  root.innerHTML = `
    <div class="moments-unlock-frame" aria-hidden="true">
      <div class="moments-unlock-sweep"></div>
    </div>
    <p class="moments-unlock-runner" aria-hidden="true"></p>
    <p class="moments-unlock-live" aria-live="assertive"></p>
  `
  document.body.appendChild(root)
  return root
}

export function playPackUnlockCeremony(packTitle: string): Promise<void> {
  const root = ensureCeremonyRoot()
  const runner = root.querySelector<HTMLElement>('.moments-unlock-runner')
  const live = root.querySelector<HTMLElement>('.moments-unlock-live')
  const label = packTitle.trim() || 'Unlocked'

  if (runner) runner.textContent = label
  if (live) live.textContent = `${label} unlocked`

  root.hidden = false
  root.classList.remove('is-active', 'is-reduced')
  if (prefersReducedMotion()) root.classList.add('is-reduced')
  void root.getBoundingClientRect()
  root.classList.add('is-active')
  document.documentElement.classList.add('moments-unlock-active')

  const ms = prefersReducedMotion() ? CEREMONY_MS_REDUCED : CEREMONY_MS

  return new Promise((resolve) => {
    window.setTimeout(() => {
      root.classList.remove('is-active', 'is-reduced')
      root.hidden = true
      document.documentElement.classList.remove('moments-unlock-active')
      if (live) live.textContent = ''
      resolve()
    }, ms)
  })
}

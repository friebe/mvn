/** Stint mark — sit plane · stem · stand plane. Uses currentColor. */
export function brandMarkSvg(size = 28): string {
  return `<svg
    class="brand-mark"
    viewBox="0 0 32 32"
    width="${size}"
    height="${size}"
    aria-hidden="true"
    focusable="false"
  >
    <rect x="2" y="20" width="16" height="4" rx="1" fill="currentColor"/>
    <rect x="14" y="10" width="4" height="12" rx="0.5" fill="currentColor"/>
    <rect x="14" y="8" width="16" height="4" rx="1" fill="currentColor"/>
  </svg>`
}

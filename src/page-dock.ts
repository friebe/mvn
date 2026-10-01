/** Mobile-only back control at the instrument edge. Hidden on desktop via CSS. */

export function pageDockHtml(href: string, ariaLabel: string): string {
  return `
    <nav class="page-dock" aria-label="${ariaLabel}">
      <a class="page-dock-back" href="${href}" aria-label="${ariaLabel}">
        <svg class="page-dock-icon" viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false">
          <path fill="currentColor" d="M15.41 7.41 14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
        </svg>
        <span>Back</span>
      </a>
    </nav>
  `
}

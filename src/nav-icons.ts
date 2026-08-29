/** Shared header nav icons — keep in sync across desk, moments, analytics. */

const ICON_ATTRS = 'class="icon" viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false"'

/** Stacked cards — moment packs / library, not a menu list. */
export function momentsNavIconHtml(): string {
  return `<svg ${ICON_ATTRS}>
    <path fill="currentColor" opacity="0.35" d="M9 7h11v11H9V7z" />
    <path fill="currentColor" d="M4 6h11v11H4V6z" />
  </svg>`
}

export function analyticsNavIconHtml(): string {
  return `<svg ${ICON_ATTRS}>
    <path fill="currentColor" d="M5 19V9h2.5v10H5Zm5.75 0V5h2.5v14h-2.5ZM16.5 19v-6H19v6h-2.5Z" />
  </svg>`
}

export function settingsNavIconHtml(): string {
  return `<svg ${ICON_ATTRS}>
    <path fill="currentColor" d="M19.14 12.94c.04-.31.06-.63.06-.94s-.02-.63-.06-.94l2.03-1.58a.5.5 0 0 0 .12-.64l-1.92-3.32a.5.5 0 0 0-.6-.22l-2.39.96a7.03 7.03 0 0 0-1.63-.94l-.36-2.54A.5.5 0 0 0 14.3 2h-4.6a.5.5 0 0 0-.49.42l-.36 2.54c-.58.23-1.12.54-1.63.94l-2.39-.96a.5.5 0 0 0-.6.22L2.31 8.48a.5.5 0 0 0 .12.64L4.46 10.7c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58a.5.5 0 0 0-.12.64l1.92 3.32c.14.24.43.34.68.22l2.39-.96c.5.4 1.05.72 1.63.94l.36 2.54c.05.24.25.42.49.42h4.6c.24 0 .44-.18.49-.42l.36-2.54c.58-.22 1.12-.54 1.63-.94l2.39.96c.25.12.54.02.68-.22l1.92-3.32a.5.5 0 0 0-.12-.64l-2.03-1.58ZM12 15.5A3.5 3.5 0 1 1 12 8.5a3.5 3.5 0 0 1 0 7Z" />
  </svg>`
}

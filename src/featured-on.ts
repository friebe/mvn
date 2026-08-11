import featuredBadges from './featured.json'
import { isStandaloneDisplay } from './pwa'

export type FeaturedBadge = {
  name: string
  href: string
  image: string
  alt: string
  width?: number
}

/** Quiet directory credits — browser landing only, never in installed PWA. */
export function shouldShowFeaturedOn(): boolean {
  return !isStandaloneDisplay()
}

export function featuredOnHtml(): string {
  const badges = featuredBadges as FeaturedBadge[]
  if (badges.length === 0) return ''
  const items = badges
    .map(
      (b) => `
        <li>
          <a
            class="featured-on-link"
            href="${b.href}"
            target="_blank"
            rel="noopener noreferrer"
          >
            <img
              src="${b.image}"
              width="${b.width ?? 200}"
              alt="${b.alt || b.name}"
              loading="lazy"
              decoding="async"
            />
          </a>
        </li>`,
    )
    .join('')
  return `
      <aside class="featured-on" id="featured-on" hidden aria-label="Featured on">
        <p class="featured-on-label">Featured on</p>
        <ul class="featured-on-list">${items}</ul>
      </aside>`
}

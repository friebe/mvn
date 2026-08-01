import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import { resolve } from 'node:path'

/** GitHub Pages default `/mvn/`; Netlify sets `BASE_PATH=/`. */
function normalizeBase(raw: string | undefined): string {
  const value = (raw ?? '/mvn/').trim() || '/'
  if (value === '/') return '/'
  return `/${value.replace(/^\/+|\/+$/g, '')}/`
}

const base = normalizeBase(process.env.BASE_PATH)
const basePathNoSlash = base.replace(/\/$/, '') || ''

export default defineConfig({
  base,
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        analytics: resolve(__dirname, 'analytics.html'),
        settings: resolve(__dirname, 'settings.html'),
      },
    },
  },
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [
        'robots.txt',
        'sitemap.xml',
        'icons/icon.svg',
        'icons/icon-maskable.svg',
        'icons/stint-mark.svg',
        'icons/icon-96.png',
        'icons/icon-192.png',
        'icons/icon-512.png',
        'icons/icon-maskable-512.png',
        'icons/apple-touch-icon.png',
      ],
      manifest: {
        id: base,
        name: 'Stint',
        short_name: 'Stint',
        description:
          'Sit · micro-move · stand. Calm, minimal desk rhythm for sit/stand desks. Not a focus timer.',
        lang: 'en',
        dir: 'ltr',
        categories: ['health', 'productivity', 'lifestyle'],
        theme_color: '#141f1c',
        background_color: '#f3efe6',
        display: 'standalone',
        orientation: 'any',
        start_url: base,
        scope: base,
        icons: [
          {
            src: 'icons/icon-96.png',
            sizes: '96x96',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'icons/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        importScripts: ['sw-notify-click.js'],
        navigateFallback: base === '/' ? '/index.html' : `${base}index.html`,
        navigateFallbackDenylist: [
          new RegExp(`^${basePathNoSlash}/analytics\\.html$`),
          new RegExp(`^${basePathNoSlash}/settings\\.html$`),
        ],
      },
      devOptions: {
        enabled: true,
        type: 'module',
      },
    }),
  ],
})

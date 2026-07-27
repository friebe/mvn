import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import { resolve } from 'node:path'

const base = '/mvn/'

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
        'icons/icon.svg',
        'icons/icon-192.png',
        'icons/icon-512.png',
        'icons/apple-touch-icon.png',
      ],
      manifest: {
        name: 'MVN',
        short_name: 'MVN',
        description: 'Minimal Viable Movement — elastischer Schreibtisch-Copilot',
        theme_color: '#1a2e28',
        background_color: '#f4f1ea',
        display: 'standalone',
        orientation: 'any',
        start_url: '/mvn/',
        scope: '/mvn/',
        icons: [
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
            src: 'icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        navigateFallback: `${base}index.html`,
        navigateFallbackDenylist: [
          new RegExp(`^${base.replace(/\/$/, '')}/analytics\\.html$`),
          new RegExp(`^${base.replace(/\/$/, '')}/settings\\.html$`),
        ],
      },
      devOptions: {
        enabled: true,
        type: 'module',
      },
    }),
  ],
})

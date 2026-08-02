import { defineConfig } from 'astro/config'

/** Static blog at https://getstint.de/blog/ — builds into root dist/blog. */
export default defineConfig({
  site: 'https://getstint.de',
  base: '/blog',
  outDir: '../dist/blog',
  trailingSlash: 'always',
})

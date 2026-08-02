/** Site-root URLs shared by blog layout + pages. */

/** Stint app — Vite in local blog-dev, Netlify root in production. */
export const appHref = import.meta.env.DEV ? 'http://127.0.0.1:5173/' : '/'

export const blogHref = '/blog/'

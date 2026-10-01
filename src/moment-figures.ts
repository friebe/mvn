/** SVG files are loaded inline so currentColor follows the active Stint theme. */
const FIGURE_MODULES = import.meta.glob<string>('./moment-figures/*.svg', {
  eager: true,
  query: '?raw',
  import: 'default',
})

const FIGURES = new Map(
  Object.entries(FIGURE_MODULES).map(([path, svg]) => {
    const file = path.split('/').pop() ?? ''
    return [file.replace(/\.svg$/, ''), svg.trim()]
  }),
)

export type MomentFigureSize = 'thumb' | 'stage'

export function momentFigureHtml(
  figureId: string | undefined,
  size: MomentFigureSize = 'thumb',
): string {
  if (!figureId) return ''
  const svg = FIGURES.get(figureId)
  if (!svg) return ''
  return `<span class="moment-figure moment-figure--${size}" aria-hidden="true">${svg}</span>`
}

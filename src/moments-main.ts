import '@fontsource/fraunces/600.css'
import '@fontsource/source-sans-3/400.css'
import '@fontsource/source-sans-3/600.css'
import './moments.css'
import './moment-player.css'

import { playMomentDone } from './audio'
import { brandLockupHtml, BRAND_TAG, HEADER_MARK_SIZE } from './brand-mark'
import {
  analyticsNavIconHtml,
  momentsNavIconHtml,
  settingsNavIconHtml,
} from './nav-icons'
import { getMoment, momentPrompt } from './exercises'
import { secondsFromMs } from './intervals'
import {
  bindMomentPlayer,
  momentPlayerHtml,
  updateMomentPlayer,
} from './moment-player'
import {
  getMomentPack,
  getPackMoments,
  isPackOwned,
  packZoneSections,
  PACK_ZONE_META,
  type MomentPack,
} from './moment-packs'
import { appPath } from './paths'
import { getResolvedMomentDuration } from './preferences'
import { loadState } from './state'
import { applyThemeFromState, bindSystemThemeListener, normalizeTheme } from './theme'
import { bindThemeToggle, syncThemeToggle, themeToggleButtonHtml } from './theme-toggle'

applyThemeFromState(loadState())
bindSystemThemeListener(() => normalizeTheme(loadState().theme))

type View =
  | { kind: 'browse' }
  | { kind: 'pack'; packId: string }
  | {
      kind: 'play'
      packId: string
      momentIds: string[]
      index: number
      endsAt: number
      durationMs: number
    }
  | { kind: 'done'; packId: string; count: number }

const TICK_MS = 250

let view: View = { kind: 'browse' }
let tickId: number | null = null

function stopTick(): void {
  if (tickId != null) {
    window.clearInterval(tickId)
    tickId = null
  }
}

function momentDurationMs(): number {
  return getResolvedMomentDuration()
}

function durationNote(): string {
  const sec = secondsFromMs(momentDurationMs())
  return `${sec}s per moment — Settings → Intervals.`
}

function packDurationLabel(momentCount: number): string {
  const totalSec = secondsFromMs(momentDurationMs()) * momentCount
  if (totalSec < 60) return `~${totalSec}s`
  const min = Math.max(1, Math.round(totalSec / 60))
  return `~${min} min`
}

function headerNav(): string {
  return `
    <nav class="moments-nav" aria-label="App">
      ${themeToggleButtonHtml()}
      <a class="icon-link" href="${appPath('moments.html')}" aria-label="Moments" title="Moments" aria-current="page">
        ${momentsNavIconHtml()}
      </a>
      <a class="icon-link" href="${appPath('analytics.html')}" aria-label="Analytics" title="Analytics">
        ${analyticsNavIconHtml()}
      </a>
      <a class="icon-link" href="${appPath('settings.html')}" aria-label="Settings" title="Settings">
        ${settingsNavIconHtml()}
      </a>
    </nav>
  `
}

function shellTop(backHref: string, backLabel: string): string {
  return `
    <header class="moments-top">
      <a class="icon-link back-link" href="${backHref}" aria-label="${backLabel}" title="${backLabel}">
        <svg class="icon" viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false">
          <path fill="currentColor" d="M15.41 7.41 14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
        </svg>
      </a>
      <div class="moments-heading app-header-brand">
        ${brandLockupHtml(BRAND_TAG, HEADER_MARK_SIZE)}
      </div>
      ${headerNav()}
    </header>
  `
}

function packRowHtml(pack: MomentPack): string {
  const count = getPackMoments(pack).length
  const locked = !isPackOwned(pack.id)
  const zoneTitle = PACK_ZONE_META[pack.zone].title
  return `
    <li>
      <button
        type="button"
        class="pack-row${locked ? ' is-locked' : ''}"
        data-pack-id="${pack.id}"
        ${locked ? 'disabled' : ''}
      >
        <span class="pack-row-kind">${zoneTitle}</span>
        <span class="pack-row-title">${pack.title}</span>
        <span class="pack-row-meta">${count} moment${count === 1 ? '' : 's'} · ${packDurationLabel(count)}</span>
      </button>
    </li>
  `
}

function renderBrowse(root: HTMLElement): void {
  stopTick()
  const packs = packZoneSections().flatMap((section) => section.packs)

  root.innerHTML = `
    <div class="moments">
      ${shellTop(appPath(), 'Back to app')}
      <div class="moments-lede">
        <h1 class="moments-title">Moments</h1>
        <p class="moments-note">${durationNote()}</p>
      </div>
      <ul class="pack-list" aria-label="Moment packs">
        ${packs.map((pack) => packRowHtml(pack)).join('')}
      </ul>
    </div>
  `

  root.querySelectorAll<HTMLButtonElement>('[data-pack-id]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const packId = btn.dataset.packId
      if (!packId || !isPackOwned(packId)) return
      view = { kind: 'pack', packId }
      window.location.hash = packId
      render(root)
    })
  })
}

function renderPack(root: HTMLElement, pack: MomentPack): void {
  stopTick()
  const moments = getPackMoments(pack)
  const durationMs = momentDurationMs()

  root.innerHTML = `
    <div class="moments">
      ${shellTop(appPath('moments.html'), 'Back to library')}
      <div class="pack-detail">
        <p class="pack-kind">${PACK_ZONE_META[pack.zone].title}</p>
        <h1 class="pack-title">${pack.title}</h1>
        <p class="pack-desc">${pack.description}</p>
        <p class="pack-meta">${moments.length} moment${moments.length === 1 ? '' : 's'} · ${packDurationLabel(moments.length)} · ${durationNote()}</p>
        <ol class="moment-sequence" aria-label="Moments in pack">
          ${moments
            .map(
              (m) => `
            <li class="moment-step">
              <p class="moment-step-title">${m.title}</p>
              <p class="moment-step-prompt">${momentPrompt(m, durationMs)}</p>
            </li>
          `,
            )
            .join('')}
        </ol>
        <div class="moments-actions">
          <div class="moments-row">
            <button type="button" class="btn btn-primary" id="btn-run-pack">Run pack</button>
          </div>
          <div class="moments-row moments-row-secondary">
            <a class="btn btn-ghost" href="${appPath('moments.html')}">All packs</a>
          </div>
        </div>
      </div>
    </div>
  `

  root.querySelector('#btn-run-pack')?.addEventListener('click', () => {
    startPlay(pack.id, moments.map((m) => m.id))
    render(root)
  })
}

function startPlay(packId: string, momentIds: string[]): void {
  if (momentIds.length === 0) return
  const durationMs = momentDurationMs()
  view = {
    kind: 'play',
    packId,
    momentIds,
    index: 0,
    endsAt: Date.now() + durationMs,
    durationMs,
  }
}

function remainingMs(v: Extract<View, { kind: 'play' }>): number {
  return Math.max(0, v.endsAt - Date.now())
}

function advancePlay(root: HTMLElement, completed: boolean): void {
  if (view.kind !== 'play') return
  const { packId, momentIds, index } = view
  const sound = loadState().soundEnabled

  if (completed) playMomentDone(sound)

  const nextIndex = index + 1
  if (nextIndex >= momentIds.length) {
    stopTick()
    view = { kind: 'done', packId, count: momentIds.length }
    render(root)
    return
  }

  const durationMs = momentDurationMs()
  view = {
    kind: 'play',
    packId,
    momentIds,
    index: nextIndex,
    endsAt: Date.now() + durationMs,
    durationMs,
  }
  render(root)
}

function renderPlay(root: HTMLElement, v: Extract<View, { kind: 'play' }>): void {
  if (!getMomentPack(v.packId) || !getMoment(v.momentIds[v.index])) {
    view = { kind: 'browse' }
    render(root)
    return
  }

  const moment = getMoment(v.momentIds[v.index])!
  const rem = remainingMs(v)
  const playerState = {
    title: moment.title,
    hint: momentPrompt(moment, v.durationMs),
    remainingMs: rem,
    durationMs: v.durationMs,
  }

  root.innerHTML = `
    <div class="moments">
      ${shellTop(`${appPath('moments.html')}#${v.packId}`, 'Back to pack')}
      ${momentPlayerHtml(playerState, {
        skipLabel: v.index + 1 < v.momentIds.length ? 'Skip' : 'Finish',
        stopLabel: 'Stop pack',
      })}
    </div>
  `

  bindMomentPlayer(root, {
    onDone: () => advancePlay(root, true),
    onSkip: () => advancePlay(root, false),
    onStop: () => {
      stopTick()
      view = { kind: 'pack', packId: v.packId }
      render(root)
    },
  })

  stopTick()
  tickId = window.setInterval(() => {
    if (view.kind !== 'play') {
      stopTick()
      return
    }
    const left = remainingMs(view)
    const m = getMoment(view.momentIds[view.index])
    if (!m) return
    updateMomentPlayer(root, {
      title: m.title,
      hint: momentPrompt(m, view.durationMs),
      remainingMs: left,
      durationMs: view.durationMs,
    })
    if (left <= 0) advancePlay(root, true)
  }, TICK_MS)
}

function renderDone(root: HTMLElement, v: Extract<View, { kind: 'done' }>): void {
  stopTick()
  const pack = getMomentPack(v.packId)
  root.innerHTML = `
    <div class="moments">
      ${shellTop(appPath('moments.html'), 'Back to library')}
      <section class="player-done">
        <p class="player-done-lead">Pack done.</p>
        <p class="player-done-sub">${v.count} moment${v.count === 1 ? '' : 's'}${pack ? ` · ${pack.title}` : ''}.</p>
      </section>
      <div class="moments-actions">
        <div class="moments-row">
          <button type="button" class="btn btn-primary" id="btn-again">Run again</button>
        </div>
        <div class="moments-row moments-row-secondary">
          <button type="button" class="btn btn-ghost" id="btn-back-pack">Back to pack</button>
          <a class="btn btn-ghost" href="${appPath()}">Desk rhythm</a>
        </div>
      </div>
    </div>
  `

  root.querySelector('#btn-again')?.addEventListener('click', () => {
    const packObj = getMomentPack(v.packId)
    if (!packObj) return
    startPlay(v.packId, getPackMoments(packObj).map((m) => m.id))
    render(root)
  })

  root.querySelector('#btn-back-pack')?.addEventListener('click', () => {
    view = { kind: 'pack', packId: v.packId }
    render(root)
  })
}

function wireHeader(root: HTMLElement): void {
  bindThemeToggle(root)
  syncThemeToggle(root)
}

function render(root: HTMLElement): void {
  if (view.kind === 'browse') {
    renderBrowse(root)
    wireHeader(root)
    return
  }
  if (view.kind === 'pack') {
    const pack = getMomentPack(view.packId)
    if (!pack || !isPackOwned(view.packId)) {
      view = { kind: 'browse' }
      renderBrowse(root)
      wireHeader(root)
      return
    }
    renderPack(root, pack)
    wireHeader(root)
    return
  }
  if (view.kind === 'play') {
    renderPlay(root, view)
    wireHeader(root)
    return
  }
  renderDone(root, view)
  wireHeader(root)
}

const root = document.querySelector<HTMLElement>('#app')!

const hashPack = window.location.hash.replace(/^#/, '')
if (hashPack && getMomentPack(hashPack) && isPackOwned(hashPack)) {
  view = { kind: 'pack', packId: hashPack }
}

render(root)

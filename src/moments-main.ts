import '@fontsource/fraunces/600.css'
import '@fontsource/source-sans-3/400.css'
import '@fontsource/source-sans-3/600.css'
import './moments.css'
import './moment-player.css'

import { playMomentDone, playPackCue, unlockAudio } from './audio'
import { brandLockupHtml, BRAND_TAG, HEADER_MARK_SIZE } from './brand-mark'
import {
  analyticsNavIconHtml,
  momentsNavIconHtml,
  settingsNavIconHtml,
} from './nav-icons'
import { getMoment, momentPrompt, type Moment } from './exercises'
import { momentFigureHtml } from './moment-figures'
import { PACK_DURATION_OPTIONS_SEC, secondsFromMs } from './intervals'
import {
  bindMomentPlayer,
  momentPlayerHtml,
  updateMomentPlayer,
} from './moment-player'
import {
  getMomentPack,
  getPackMoments,
  isMomentInLoop,
  isPackOwned,
  loopCountInPack,
  loopMomentIds,
  loopMomentsByPack,
  packZoneSections,
  PACK_ZONE_META,
  setMomentInLoop,
  type MomentPack,
} from './moment-packs'
import { appPath } from './paths'
import { pageDockHtml } from './page-dock'
import { setPackPlayAwake } from './wake-lock'
import {
  getResolvedMomentDuration,
  getResolvedPackDuration,
  setPackDuration,
} from './preferences'
import { loadState } from './state'
import { applyThemeFromState, bindSystemThemeListener, normalizeTheme } from './theme'
import { bindThemeToggle, syncThemeToggle, themeToggleButtonHtml } from './theme-toggle'

applyThemeFromState(loadState())
bindSystemThemeListener(() => normalizeTheme(loadState().theme))

type View =
  | { kind: 'browse' }
  | { kind: 'favorites' }
  | { kind: 'pack'; packId: string }
  | {
      kind: 'play'
      packId: string
      momentIds: string[]
      index: number
      endsAt: number
      durationMs: number
      warned3: boolean
      warnedSide: boolean
    }
  | { kind: 'done'; packId: string; count: number }

const TICK_MS = 250
const PACK_WARN_MS = 3000

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

function packDurationMs(): number {
  return getResolvedPackDuration()
}

function durationNote(): string {
  const sec = secondsFromMs(momentDurationMs())
  return `${sec}s per moment — Settings → Intervals.`
}

function packDurationLabel(momentCount: number): string {
  const totalSec = secondsFromMs(packDurationMs()) * momentCount
  if (totalSec < 60) return `~${totalSec}s`
  const min = Math.max(1, Math.round(totalSec / 60))
  return `~${min} min`
}

function packDurationTabsHtml(): string {
  const current = secondsFromMs(packDurationMs())
  return `
    <div class="pack-duration" role="radiogroup" aria-label="Seconds per moment">
      ${PACK_DURATION_OPTIONS_SEC.map(
        (sec) => `
        <button
          type="button"
          class="pack-duration-tab${sec === current ? ' is-on' : ''}"
          data-pack-sec="${sec}"
          role="radio"
          aria-checked="${sec === current ? 'true' : 'false'}"
        >${sec}s</button>`,
      ).join('')}
    </div>
  `
}

function libraryHref(): string {
  return `${appPath('moments.html')}#`
}

function headerNav(): string {
  return `
    <nav class="moments-nav" aria-label="App">
      ${themeToggleButtonHtml()}
      <a class="icon-link" href="${libraryHref()}" aria-label="Moments" title="Moments" aria-current="page">
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

function backLinkHtml(href: string, label: string): string {
  return `
      <a class="icon-link back-link" href="${href}" aria-label="${label}" title="${label}">
        <svg class="icon" viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false">
          <path fill="currentColor" d="M15.41 7.41 14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
        </svg>
      </a>`
}

function shellTop(backHref: string, backLabel: string): string {
  return `
    <header class="moments-top">
      ${backLinkHtml(backHref, backLabel)}
      <div class="moments-heading app-header-brand">
        ${brandLockupHtml(BRAND_TAG, HEADER_MARK_SIZE)}
      </div>
      ${headerNav()}
    </header>
  `
}

function playTop(): string {
  return `
    <header class="moments-top moments-top-play">
      <button type="button" class="icon-link back-link" id="btn-play-back" aria-label="Back to pack" title="Back to pack">
        <svg class="icon" viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false">
          <path fill="currentColor" d="M15.41 7.41 14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
        </svg>
      </button>
      ${themeToggleButtonHtml()}
    </header>
  `
}

function packRowHtml(pack: MomentPack): string {
  const count = getPackMoments(pack).length
  const locked = !isPackOwned(pack.id)
  const zoneTitle = PACK_ZONE_META[pack.zone].title
  const inLoop = loopCountInPack(pack)
  const loopMeta =
    inLoop === 0
      ? `${count} moment${count === 1 ? '' : 's'}`
      : inLoop === count
        ? `${count} moment${count === 1 ? '' : 's'} in sit/stand`
        : `${inLoop} of ${count} in sit/stand`
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
        <span class="pack-row-meta">${loopMeta} · ${packDurationLabel(count)}</span>
      </button>
    </li>
  `
}

function momentPickHtml(moment: Moment, durationMs: number): string {
  const on = isMomentInLoop(moment.id)
  const figure = momentFigureHtml(moment.figureId, 'thumb')
  return `
    <li>
      <label class="moment-pick${figure ? ' has-figure' : ''}">
        <input
          type="checkbox"
          class="moment-pick-input"
          data-moment-id="${moment.id}"
          ${on ? 'checked' : ''}
        />
        <span class="moment-pick-ui" aria-hidden="true" data-checked="${on ? 'true' : 'false'}"></span>
        ${figure}
        <span class="moment-pick-copy">
          <span class="moment-step-title">${moment.title}</span>
          <span class="moment-step-prompt">${momentPrompt(moment, durationMs)}</span>
        </span>
      </label>
    </li>
  `
}

function bindMomentPicks(root: HTMLElement, onChange: () => void): void {
  root.querySelectorAll<HTMLInputElement>('.moment-pick-input').forEach((input) => {
    input.addEventListener('change', () => {
      const id = input.dataset.momentId
      if (!id) return
      setMomentInLoop(id, input.checked)
      onChange()
    })
  })
}

function renderBrowse(root: HTMLElement): void {
  stopTick()
  const packs = packZoneSections().flatMap((section) => section.packs)
  const loopCount = loopMomentIds().length

  root.innerHTML = `
    <div class="moments">
      ${shellTop(appPath(), 'Back to app')}
      <div class="moments-lede">
        <h1 class="moments-title">Moments</h1>
        <p class="moments-note">Run a pack in full, or check a moment into sit/stand. Starters are already in Favorites.</p>
      </div>
      <ul class="pack-list pack-list-loop" aria-label="Sit/stand favorites">
        <li>
          <button type="button" class="pack-row" id="btn-favorites">
            <span class="pack-row-kind">Loop</span>
            <span class="pack-row-title">Favorites</span>
            <span class="pack-row-meta">${loopCount} in sit/stand</span>
          </button>
        </li>
      </ul>
      <ul class="pack-list" aria-label="Moment packs">
        ${packs.map((pack) => packRowHtml(pack)).join('')}
      </ul>
      ${pageDockHtml(appPath(), 'Back to app')}
    </div>
  `

  root.querySelector('#btn-favorites')?.addEventListener('click', () => {
    view = { kind: 'favorites' }
    window.location.hash = 'favorites'
    render(root)
  })

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

function renderFavorites(root: HTMLElement): void {
  stopTick()
  const groups = loopMomentsByPack()
  const durationMs = momentDurationMs()
  const count = loopMomentIds().length
  const empty = groups.length === 0

  root.innerHTML = `
    <div class="moments">
      ${shellTop(libraryHref(), 'Back to library')}
      <div class="moments-lede">
        <p class="pack-kind">Loop</p>
        <h1 class="moments-title">Favorites</h1>
        <p class="moments-note">
          ${
            empty
              ? 'Starter favorites will fill sit/stand until you pick some.'
              : 'Sit/stand picks from here.'
          }
        </p>
        ${empty ? '' : `<p class="pack-meta">${count} moment${count === 1 ? '' : 's'} · ${durationNote()}</p>`}
      </div>
      ${
        empty
          ? ''
          : groups
              .map(
                (group) => `
        <section class="fav-group" aria-label="${group.pack.title}">
          <p class="pack-kind">${PACK_ZONE_META[group.pack.zone].title}</p>
          <h2 class="fav-group-title">${group.pack.title}</h2>
          <ul class="moment-sequence">
            ${group.moments.map((m) => momentPickHtml(m, durationMs)).join('')}
          </ul>
        </section>`,
              )
              .join('')
      }
      <div class="moments-actions">
        <div class="moments-row moments-row-secondary">
          <a class="btn btn-ghost" href="${libraryHref()}">All packs</a>
        </div>
      </div>
    </div>
  `

  bindMomentPicks(root, () => render(root))
}

function packLoopNote(inLoop: number, total: number): string {
  if (inLoop === 0) {
    return 'Check a moment to add it to sit/stand. Run pack always plays the full pack.'
  }
  return `${inLoop} of ${total} in sit/stand.`
}

function renderPack(root: HTMLElement, pack: MomentPack): void {
  stopTick()
  const moments = getPackMoments(pack)
  const durationMs = packDurationMs()
  const inLoop = loopCountInPack(pack)

  root.innerHTML = `
    <div class="moments">
      ${shellTop(libraryHref(), 'Back to library')}
      <div class="pack-detail">
        <p class="pack-kind">${PACK_ZONE_META[pack.zone].title}</p>
        <h1 class="pack-title">${pack.title}</h1>
        <p class="pack-desc">${pack.description}</p>
        <p class="pack-meta">${moments.length} moment${moments.length === 1 ? '' : 's'} · ${packDurationLabel(moments.length)}</p>
        <p class="pack-loop-note">${packLoopNote(inLoop, moments.length)}</p>
        <ol class="moment-sequence" aria-label="Moments in pack">
          ${moments.map((m) => momentPickHtml(m, durationMs)).join('')}
        </ol>
        <div class="moments-actions">
          ${packDurationTabsHtml()}
          <div class="moments-row">
            <button type="button" class="btn btn-primary" id="btn-run-pack">Run pack</button>
          </div>
          <div class="moments-row moments-row-secondary">
            <a class="btn btn-ghost" href="${appPath('moments.html')}#favorites">Favorites</a>
            <a class="btn btn-ghost" href="${libraryHref()}">All packs</a>
          </div>
        </div>
      </div>
    </div>
  `

  bindMomentPicks(root, () => {
    const loopNote = root.querySelector('.pack-loop-note')
    if (loopNote) {
      loopNote.textContent = packLoopNote(loopCountInPack(pack), moments.length)
    }
    root.querySelectorAll<HTMLInputElement>('.moment-pick-input').forEach((input) => {
      const box = input.nextElementSibling
      if (box instanceof HTMLElement && box.classList.contains('moment-pick-ui')) {
        box.dataset.checked = input.checked ? 'true' : 'false'
      }
    })
  })

  root.querySelectorAll<HTMLButtonElement>('[data-pack-sec]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const sec = Number(btn.dataset.packSec)
      if (!Number.isFinite(sec)) return
      setPackDuration(sec)
      render(root)
    })
  })

  root.querySelector('#btn-run-pack')?.addEventListener('click', () => {
    unlockAudio()
    startPlay(pack.id, moments.map((m) => m.id))
    render(root)
  })
}

function startPlay(packId: string, momentIds: string[]): void {
  if (momentIds.length === 0) return
  const durationMs = packDurationMs()
  view = {
    kind: 'play',
    packId,
    momentIds,
    index: 0,
    endsAt: Date.now() + durationMs,
    durationMs,
    warned3: false,
    warnedSide: false,
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

  const durationMs = packDurationMs()
  view = {
    kind: 'play',
    packId,
    momentIds,
    index: nextIndex,
    endsAt: Date.now() + durationMs,
    durationMs,
    warned3: false,
    warnedSide: false,
  }
  render(root)
}

function packPlayHint(moment: Moment, durationMs: number): string {
  return moment.promptLong ?? momentPrompt(moment, durationMs)
}

function packCueLabel(
  v: Extract<View, { kind: 'play' }>,
  moment: Moment,
  left: number,
): string {
  if (left <= 0) return ''
  if (left <= PACK_WARN_MS) {
    return v.index + 1 < v.momentIds.length ? 'Nächste' : 'Gleich'
  }
  if (moment.sideSwitch && left <= v.durationMs / 2) return 'Andere Seite'
  return ''
}

function firePackCues(
  v: Extract<View, { kind: 'play' }>,
  moment: Moment,
  left: number,
): void {
  if (left <= 0) return
  const sound = loadState().soundEnabled
  const half = v.durationMs / 2
  if (moment.sideSwitch && !v.warnedSide && left <= half && left > PACK_WARN_MS) {
    v.warnedSide = true
    playPackCue(sound)
  }
  if (!v.warned3 && left <= PACK_WARN_MS) {
    v.warned3 = true
    playPackCue(sound)
  }
}

function renderPlay(root: HTMLElement, v: Extract<View, { kind: 'play' }>): void {
  if (!getMomentPack(v.packId) || !getMoment(v.momentIds[v.index])) {
    view = { kind: 'browse' }
    render(root)
    return
  }

  const moment = getMoment(v.momentIds[v.index])!
  const rem = remainingMs(v)
  const step = `${v.index + 1} / ${v.momentIds.length}`
  const playerState = {
    phaseLabel: step,
    title: moment.title,
    hint: packPlayHint(moment, v.durationMs),
    remainingMs: rem,
    durationMs: v.durationMs,
    figureHtml: momentFigureHtml(moment.figureId, 'stage'),
    cue: packCueLabel(v, moment, rem),
    ending: rem <= PACK_WARN_MS && rem > 0,
  }

  root.innerHTML = `
    <div class="moments">
      ${playTop()}
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

  const leavePack = () => {
    stopTick()
    view = { kind: 'pack', packId: v.packId }
    render(root)
  }
  root.querySelector('#btn-play-back')?.addEventListener('click', leavePack)

  stopTick()
  tickId = window.setInterval(() => {
    if (view.kind !== 'play') {
      stopTick()
      return
    }
    const left = remainingMs(view)
    const m = getMoment(view.momentIds[view.index])
    if (!m) return
    firePackCues(view, m, left)
    updateMomentPlayer(root, {
      title: m.title,
      hint: packPlayHint(m, view.durationMs),
      remainingMs: left,
      durationMs: view.durationMs,
      figureHtml: momentFigureHtml(m.figureId, 'stage'),
      cue: packCueLabel(view, m, left),
      ending: left <= PACK_WARN_MS && left > 0,
    })
    if (left <= 0) advancePlay(root, true)
  }, TICK_MS)
}

function renderDone(root: HTMLElement, v: Extract<View, { kind: 'done' }>): void {
  stopTick()
  const pack = getMomentPack(v.packId)
  root.innerHTML = `
    <div class="moments">
      ${shellTop(libraryHref(), 'Back to library')}
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
    unlockAudio()
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
  setPackPlayAwake(view.kind === 'play')
  if (view.kind === 'browse') {
    renderBrowse(root)
    wireHeader(root)
    return
  }
  if (view.kind === 'favorites') {
    renderFavorites(root)
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
if (hashPack === 'favorites') {
  view = { kind: 'favorites' }
} else if (hashPack && getMomentPack(hashPack) && isPackOwned(hashPack)) {
  view = { kind: 'pack', packId: hashPack }
}

render(root)

window.addEventListener('hashchange', () => {
  if (view.kind === 'play') return
  const hash = window.location.hash.replace(/^#/, '')
  if (hash === 'favorites') {
    view = { kind: 'favorites' }
  } else if (hash && getMomentPack(hash) && isPackOwned(hash)) {
    view = { kind: 'pack', packId: hash }
  } else {
    view = { kind: 'browse' }
  }
  render(root)
})

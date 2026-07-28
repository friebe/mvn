import type { AppState } from './state'

export type ShortcutId =
  | 'start'
  | 'freeze'
  | 'resume'
  | 'rise'
  | 'lazyPath'
  | 'skipStanding'
  | 'afterplay'
  | 'extendFreeze'
  | 'doneMoment'
  | 'reroll'
  | 'toggleLazy'
  | 'checkIn'
  | 'dayCloseDone'
  | 'pick1'
  | 'pick2'
  | 'pick3'

export interface ShortcutDef {
  id: ShortcutId
  keys: string[]
  label: string
  action: string
  context: string
}

export const SHORTCUTS: ShortcutDef[] = [
  { id: 'start', keys: ['Enter', ' '], label: '↵', action: 'Start', context: 'Bereit' },
  { id: 'rise', keys: ['Enter', ' '], label: '↵', action: 'Kurz bewegen / Reset', context: 'Schwelle' },
  {
    id: 'skipStanding',
    keys: ['s', 'S'],
    label: 'S',
    action: 'Einfach setzen / Heute reicht',
    context: 'Schwelle / Moment wählen',
  },
  { id: 'lazyPath', keys: ['l', 'L'], label: 'L', action: 'Lazy weiter', context: 'Schwelle' },
  { id: 'pick1', keys: ['1'], label: '1', action: 'Moment 1', context: 'Moment wählen' },
  { id: 'pick2', keys: ['2'], label: '2', action: 'Moment 2', context: 'Moment wählen' },
  { id: 'pick3', keys: ['3'], label: '3', action: 'Moment 3', context: 'Moment wählen' },
  { id: 'freeze', keys: ['f', 'F'], label: 'F', action: 'Freeze', context: 'Sitzen / Stehen / Reset' },
  { id: 'doneMoment', keys: ['Enter', ' '], label: '↵', action: 'Erledigt', context: 'Moment' },
  { id: 'reroll', keys: ['r', 'R'], label: 'R', action: 'Anderer Moment', context: 'Moment' },
  { id: 'resume', keys: ['Enter', ' '], label: '↵', action: 'Weiter', context: 'Freeze' },
  { id: 'afterplay', keys: ['a', 'A'], label: 'A', action: 'Call-Nachspiel', context: 'Freeze-Prompt' },
  { id: 'extendFreeze', keys: ['e', 'E'], label: 'E', action: 'Noch 15 Min', context: 'Freeze-Prompt' },
  { id: 'checkIn', keys: ['Enter', ' '], label: '↵', action: 'Noch am Stehen / Tisch', context: 'Check-in' },
  { id: 'toggleLazy', keys: ['m', 'M'], label: 'M', action: 'Lazy Mode', context: 'Schnellzugriff' },
  { id: 'dayCloseDone', keys: ['Enter', ' '], label: '↵', action: 'Weiter', context: 'Tagesabschluss' },
]

const LABEL_BY_ID = new Map(SHORTCUTS.map((s) => [s.id, s.label]))

export function shortcutHintLabel(id: ShortcutId): string {
  return LABEL_BY_ID.get(id) ?? ''
}

export interface ShortcutContext {
  state: AppState
  showFreezePrompt: boolean
  dayCloseVisible: boolean
  checkInVisible: boolean
}

export function availableShortcuts(ctx: ShortcutContext): Set<ShortcutId> {
  const { state, showFreezePrompt, dayCloseVisible, checkInVisible } = ctx
  const active = new Set<ShortcutId>()

  if (dayCloseVisible) {
    active.add('dayCloseDone')
    return active
  }

  if (checkInVisible) {
    active.add('checkIn')
    return active
  }

  const phase = state.phase

  if (phase === 'setup') {
    active.add('start')
  } else if (phase === 'threshold') {
    const momentChoice = state.endedPhase === 'sit' || state.endedPhase === 'stand' || state.endedPhase === 'reset'
    if (momentChoice) active.add('skipStanding')
    active.add('rise')
    active.add('lazyPath')
  } else if (phase === 'pick') {
    const count = state.momentChoiceIds?.length ?? 0
    if (count >= 1) active.add('pick1')
    if (count >= 2) active.add('pick2')
    if (count >= 3) active.add('pick3')
    active.add('skipStanding')
  } else if (phase === 'frozen') {
    if (showFreezePrompt) {
      active.add('afterplay')
      active.add('resume')
      active.add('extendFreeze')
    } else {
      active.add('resume')
    }
  } else if (phase === 'exercise') {
    active.add('doneMoment')
    if (!state.momentRerolled) active.add('reroll')
    active.add('skipStanding')
  } else if (phase === 'sit' || phase === 'stand' || phase === 'reset') {
    active.add('freeze')
  }

  if (phase !== 'threshold' && phase !== 'exercise' && phase !== 'pick') {
    active.add('toggleLazy')
  }

  return active
}

export function matchShortcut(event: KeyboardEvent, ctx: ShortcutContext): ShortcutId | null {
  if (event.metaKey || event.ctrlKey || event.altKey) return null

  const key = event.key
  const available = availableShortcuts(ctx)

  for (const def of SHORTCUTS) {
    if (def.keys.includes(key) && available.has(def.id)) return def.id
  }
  return null
}

export function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable
}

export interface ShortcutHandlers {
  onStart: () => void
  onFreeze: () => void
  onResume: () => void
  onExtendFreeze: () => void
  onAfterplay: () => void
  onSkipStanding: () => void
  onCompleteMoment: () => void
  onRerollMoment: () => void
  onChooseMoment: (id: string) => void
  onConfirmCheckIn: () => void
  onToggleLazy: () => void
  onChooseRise: () => void
  onChooseLazyPath: () => void
  onDismissDayClose: () => void
}

export function bindShortcuts(
  getContext: () => ShortcutContext,
  handlers: ShortcutHandlers,
): () => void {
  const onKeyDown = (event: KeyboardEvent) => {
    if (isTypingTarget(event.target)) return

    const ctx = getContext()
    const id = matchShortcut(event, ctx)
    if (!id) return

    const { state } = ctx

    switch (id) {
      case 'start':
        handlers.onStart()
        break
      case 'freeze':
        handlers.onFreeze()
        break
      case 'resume':
        handlers.onResume()
        break
      case 'rise':
        handlers.onChooseRise()
        break
      case 'lazyPath':
        handlers.onChooseLazyPath()
        break
      case 'skipStanding':
        handlers.onSkipStanding()
        break
      case 'afterplay':
        handlers.onAfterplay()
        break
      case 'extendFreeze':
        handlers.onExtendFreeze()
        break
      case 'doneMoment':
        handlers.onCompleteMoment()
        break
      case 'reroll':
        handlers.onRerollMoment()
        break
      case 'checkIn':
        handlers.onConfirmCheckIn()
        break
      case 'toggleLazy':
        handlers.onToggleLazy()
        break
      case 'dayCloseDone':
        handlers.onDismissDayClose()
        break
      case 'pick1':
      case 'pick2':
      case 'pick3': {
        const index = Number(id.replace('pick', '')) - 1
        const momentId = state.momentChoiceIds?.[index]
        if (momentId) handlers.onChooseMoment(momentId)
        break
      }
    }

    event.preventDefault()
  }

  window.addEventListener('keydown', onKeyDown)
  return () => window.removeEventListener('keydown', onKeyDown)
}

export function shortcutsByContext(): Map<string, ShortcutDef[]> {
  const map = new Map<string, ShortcutDef[]>()
  const seen = new Set<string>()

  for (const def of SHORTCUTS) {
    const key = `${def.context}::${def.action}`
    if (seen.has(key)) continue
    seen.add(key)
    const list = map.get(def.context) ?? []
    list.push(def)
    map.set(def.context, list)
  }

  return map
}

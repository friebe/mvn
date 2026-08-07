import type { AppState } from './state'

export type ShortcutId =
  | 'start'
  | 'freeze'
  | 'resume'
  | 'rise'
  | 'skipStanding'
  | 'afterplay'
  | 'extendFreeze'
  | 'doneMoment'
  | 'reroll'
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
  { id: 'start', keys: ['Enter', ' '], label: '↵', action: 'Start', context: 'Ready' },
  { id: 'rise', keys: ['Enter', ' '], label: '↵', action: 'Move briefly / Reset', context: 'Threshold' },
  {
    id: 'skipStanding',
    keys: ['s', 'S'],
    label: 'S',
    action: 'Just sit / Enough today',
    context: 'Threshold / Pick moment',
  },
  { id: 'pick1', keys: ['1'], label: '1', action: 'Moment 1', context: 'Pick moment' },
  { id: 'pick2', keys: ['2'], label: '2', action: 'Moment 2', context: 'Pick moment' },
  { id: 'pick3', keys: ['3'], label: '3', action: 'Moment 3', context: 'Pick moment' },
  { id: 'freeze', keys: ['f', 'F'], label: 'F', action: 'Freeze', context: 'Sit / Stand / Reset' },
  { id: 'doneMoment', keys: ['Enter', ' '], label: '↵', action: 'Done', context: 'Moment' },
  { id: 'reroll', keys: ['r', 'R'], label: 'R', action: 'Another moment', context: 'Moment' },
  { id: 'resume', keys: ['Enter', ' '], label: '↵', action: 'Continue', context: 'Freeze' },
  { id: 'afterplay', keys: ['a', 'A'], label: 'A', action: 'Call cooldown', context: 'Freeze prompt' },
  { id: 'extendFreeze', keys: ['e', 'E'], label: 'E', action: '15 more min', context: 'Freeze prompt' },
  { id: 'checkIn', keys: ['Enter', ' '], label: '↵', action: 'Still standing / at desk', context: 'Check-in' },
  { id: 'dayCloseDone', keys: ['Enter', ' '], label: '↵', action: 'Continue', context: 'Day close' },
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
    const momentChoice =
      state.endedPhase === 'sit' || state.endedPhase === 'stand' || state.endedPhase === 'reset'
    if (momentChoice) active.add('skipStanding')
    active.add('rise')
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
  onChooseRise: () => void
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

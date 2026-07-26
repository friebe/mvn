import '@fontsource/fraunces/600.css'
import '@fontsource/source-sans-3/400.css'
import '@fontsource/source-sans-3/600.css'
import './styles.css'

import { loadState, saveState } from './state'
import { ensureNotificationPermission } from './notify'
import { mountUi, renderUi } from './ui'
import {
  extendFreeze,
  freeze,
  getState,
  initTimer,
  resetDay,
  resume,
  setMode,
  setNotificationsEnabled,
  skipExercise,
  startDay,
  subscribe,
  toggleSound,
} from './timer'

const app = document.querySelector<HTMLElement>('#app')!
const initial = loadState()

mountUi(app, {
  onStart: () => {
    startDay(getState().mode)
  },
  onReset: () => {
    resetDay()
  },
  onFreeze: () => {
    freeze()
  },
  onResume: () => {
    resume()
  },
  onExtendFreeze: () => {
    extendFreeze()
  },
  onSkip: () => {
    skipExercise()
  },
  onToggleLazy: () => {
    const next = getState().mode === 'lazy' ? 'high' : 'lazy'
    setMode(next)
  },
  onToggleSound: () => {
    toggleSound()
  },
  onEnableNotifications: async () => {
    const ok = await ensureNotificationPermission()
    setNotificationsEnabled(ok)
  },
})

initTimer(initial)

subscribe((state, remaining, showFreezePrompt) => {
  renderUi(app, state, remaining, showFreezePrompt)
  saveState(state)
})

// Re-hydrate: if mid-session, keep ticking (wall-clock handles drift)
if (initial.phase !== 'setup') {
  renderUi(app, initial, 0, false)
}

import '@fontsource/fraunces/600.css'
import '@fontsource/source-sans-3/400.css'
import '@fontsource/source-sans-3/600.css'
import './styles.css'

import { loadState, saveState } from './state'
import { ensureNotificationPermission } from './notify'
import {
  isStandaloneDisplay,
  onInstallAvailability,
  promptInstallPwa,
  registerPwa,
} from './pwa'
import { mountUi, renderUi, setInstallVisible } from './ui'
import {
  chooseFreezePath,
  chooseLazyPath,
  chooseRise,
  extendFreeze,
  freeze,
  confirmDesk,
  confirmDeskLater,
  getState,
  initTimer,
  resetDay,
  resume,
  setDemo,
  setMode,
  setNotificationsEnabled,
  skipExercise,
  startDay,
  subscribe,
  toggleDemo,
  toggleSound,
} from './timer'

registerPwa()

const app = document.querySelector<HTMLElement>('#app')!
const initial = loadState()

const params = new URLSearchParams(window.location.search)
if (params.get('demo') === '1' || params.get('demo') === 'true') {
  initial.demo = true
}

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
  onToggleDemo: () => {
    toggleDemo()
  },
  onToggleSound: () => {
    toggleSound()
  },
  onEnableNotifications: async () => {
    const ok = await ensureNotificationPermission()
    setNotificationsEnabled(ok)
  },
  onInstall: async () => {
    await promptInstallPwa()
  },
  onChooseRise: () => {
    chooseRise()
  },
  onChooseLazyPath: () => {
    chooseLazyPath()
  },
  onChooseFreezePath: () => {
    chooseFreezePath()
  },
  onConfirmDesk: () => {
    confirmDesk()
  },
  onConfirmDeskLater: () => {
    confirmDeskLater()
  },
})

onInstallAvailability((canInstall) => {
  setInstallVisible(app, canInstall && !isStandaloneDisplay())
})

subscribe((state, remaining, showFreezePrompt, approaching) => {
  renderUi(app, state, remaining, showFreezePrompt, approaching)
  saveState(state)
})

initTimer(initial)

if ((params.get('demo') === '1' || params.get('demo') === 'true') && !getState().demo) {
  setDemo(true)
}

import '@fontsource/fraunces/600.css'
import '@fontsource/source-sans-3/400.css'
import '@fontsource/source-sans-3/600.css'
import './styles.css'

import { loadState, saveState } from './state'
import {
  dismissInstallBanner,
  onInstallAvailability,
  promptInstallPwa,
  registerPwa,
  shouldShowInstallBanner,
} from './pwa'
import { bindCompactMode, mountUi, renderUi, setInstallVisible } from './ui'
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
  resume,
  setDemo,
  setMode,
  skipExercise,
  startDay,
  subscribe,
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
  onInstall: async () => {
    await promptInstallPwa()
  },
  onDismissInstall: () => {
    dismissInstallBanner()
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

bindCompactMode(app)

function updateInstallBanner(): void {
  setInstallVisible(app, shouldShowInstallBanner())
}

onInstallAvailability(updateInstallBanner)
updateInstallBanner()

subscribe((state, remaining, showFreezePrompt, approaching) => {
  renderUi(app, state, remaining, showFreezePrompt, approaching)
  saveState(state)
})

initTimer(initial)

if ((params.get('demo') === '1' || params.get('demo') === 'true') && !getState().demo) {
  setDemo(true)
}

window.addEventListener('pageshow', () => {
  initTimer(loadState())
})

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    initTimer(loadState())
  }
})

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
import {
  bindCompactMode,
  mountUi,
  renderUi,
  setInstallVisible,
  toggleExactClock,
  toggleAtmosphereWords,
} from './ui'
import {
  chooseFreezePath,
  chooseLazyPath,
  chooseMoment,
  chooseRise,
  completeMoment,
  confirmCheckIn,
  confirmDesk,
  confirmDeskLater,
  extendFreeze,
  freeze,
  getState,
  initTimer,
  rerollMoment,
  resetDay,
  resume,
  setDemo,
  setMode,
  skipStanding,
  startDay,
  startFreezeAfterplay,
  subscribe,
  refreshUi,
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
  onAfterplay: () => {
    startFreezeAfterplay()
  },
  onSkipStanding: () => {
    skipStanding()
  },
  onCompleteMoment: () => {
    completeMoment()
  },
  onRerollMoment: () => {
    rerollMoment()
  },
  onChooseMoment: (id) => {
    chooseMoment(id)
  },
  onConfirmCheckIn: () => {
    confirmCheckIn()
  },
  onToggleLazy: () => {
    const next = getState().mode === 'lazy' ? 'high' : 'lazy'
    setMode(next)
  },
  onToggleClock: () => {
    toggleExactClock()
    refreshUi()
  },
  onToggleAtmosphereWords: () => {
    toggleAtmosphereWords()
    refreshUi()
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
  onCloseDay: () => {
    if (!confirm('Tagesabschluss — Timer zurücksetzen?')) return
    const story = resetDay()
    alert(story)
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

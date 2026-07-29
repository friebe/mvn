import '@fontsource/fraunces/600.css'
import '@fontsource/source-sans-3/400.css'
import '@fontsource/source-sans-3/600.css'
import './styles.css'

import { loadState, saveState } from './state'
import { summarizeToday } from './stats'
import {
  dismissInstallBanner,
  onInstallAvailability,
  promptInstallPwa,
  registerPwa,
  shouldShowInstallBanner,
} from './pwa'
import {
  bindCompactMode,
  bindReturnOrientation,
  dismissDayCloseReward,
  isDayCloseRewardVisible,
  mountUi,
  renderUi,
  setInstallVisible,
  showDayCloseReward,
} from './ui'
import { cycleAtmosphereDisplay } from './atmosphere-display'
import { writePreferences } from './preferences'
import { bindShortcuts } from './shortcuts'
import { isLocalDebugHost } from './debug-host'
import {
  chooseLazyPath,
  chooseMoment,
  chooseRise,
  completeMoment,
  confirmCheckIn,
  extendFreeze,
  freeze,
  getState,
  initTimer,
  isCheckInVisible,
  rerollMoment,
  resetDay,
  resume,
  setAtmosphereDisplay,
  setDemo,
  setMode,
  skipStanding,
  startDay,
  startFreezeAfterplay,
  subscribe,
  refreshUi,
} from './timer'
import { initPresence } from './presence'

registerPwa()
initPresence()

const app = document.querySelector<HTMLElement>('#app')!
const initial = loadState()

const params = new URLSearchParams(window.location.search)
if (params.get('demo') === '1' || params.get('demo') === 'true') {
  initial.demo = true
}

let showFreezePromptLatest = false

const shortcutHandlers = {
  onStart: () => startDay(getState().mode),
  onFreeze: () => freeze(),
  onResume: () => resume(),
  onExtendFreeze: () => extendFreeze(),
  onAfterplay: () => startFreezeAfterplay(),
  onSkipStanding: () => skipStanding(),
  onCompleteMoment: () => completeMoment(),
  onRerollMoment: () => rerollMoment(),
  onChooseMoment: (id: string) => chooseMoment(id),
  onConfirmCheckIn: () => confirmCheckIn(),
  onToggleLazy: () => {
    const next = getState().mode === 'lazy' ? 'high' : 'lazy'
    setMode(next)
  },
  onChooseRise: () => chooseRise(),
  onChooseLazyPath: () => chooseLazyPath(),
  onDismissDayClose: () => {
    dismissDayCloseReward()
    refreshUi()
  },
}

bindShortcuts(
  () => ({
    state: getState(),
    showFreezePrompt: showFreezePromptLatest,
    dayCloseVisible: isDayCloseRewardVisible(),
    checkInVisible: isCheckInVisible(),
  }),
  shortcutHandlers,
)

mountUi(app, {
  ...shortcutHandlers,
  onToggleClock: () => {
    const next = cycleAtmosphereDisplay(getState().atmosphereDisplay ?? 'soft')
    writePreferences({ atmosphereDisplay: next })
    setAtmosphereDisplay(next)
    refreshUi()
  },
  onInstall: async () => {
    await promptInstallPwa()
  },
  onDismissInstall: () => {
    dismissInstallBanner()
  },
  onCloseDay: () => {
    if (!confirm('Close the day — reset and start fresh?')) return
    const summary = summarizeToday()
    resetDay()
    showDayCloseReward(summary)
    refreshUi()
  },
})

bindCompactMode(app)

bindReturnOrientation(() => {
  refreshUi()
})

function updateInstallBanner(): void {
  setInstallVisible(app, shouldShowInstallBanner())
}

onInstallAvailability(updateInstallBanner)
updateInstallBanner()

subscribe((state, remaining, showFreezePrompt, approaching) => {
  showFreezePromptLatest = showFreezePrompt
  renderUi(app, state, remaining, showFreezePrompt, approaching)
  saveState(state)
})

initTimer(initial)

if (isLocalDebugHost()) {
  void import('./debug').then(({ mountDebugToolbar }) => mountDebugToolbar())
}

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

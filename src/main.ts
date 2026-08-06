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
import { applyThemeFromState, bindSystemThemeListener, nextThemeToggle } from './theme'
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
  setTheme,
  skipStanding,
  snoozePosture,
  startDay,
  startFreezeAfterplay,
  subscribe,
  refreshUi,
} from './timer'
import { CHECK_IN_YES_MESSAGE, SNOOZE_POSTURE_MESSAGE } from './notify'
import { initPresence } from './presence'
import { showLaunchSplash } from './splash'
import { trackPwaLaunch } from './analytics-umami'

registerPwa()
trackPwaLaunch()
initPresence()

const app = document.querySelector<HTMLElement>('#app')!
const initial = loadState()
applyThemeFromState(initial)
bindSystemThemeListener(() => getState().theme)
showLaunchSplash()

const params = new URLSearchParams(window.location.search)
if (params.get('demo') === '1' || params.get('demo') === 'true') {
  initial.demo = true
}

let showFreezePromptLatest = false
let lastPersistedState: ReturnType<typeof getState> | null = null

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
  onSnoozePosture: () => snoozePosture(),
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
    const next = cycleAtmosphereDisplay(getState().atmosphereDisplay ?? 'clock')
    writePreferences({ atmosphereDisplay: next })
    setAtmosphereDisplay(next)
    refreshUi()
  },
  onToggleTheme: () => {
    const next = nextThemeToggle(getState().theme ?? 'system')
    writePreferences({ theme: next })
    setTheme(next)
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
  // Tick-derived remaining is computed from phaseEndsAt — only persist real state mutations.
  if (state !== lastPersistedState) {
    lastPersistedState = state
    saveState(state)
  }
})

initTimer(initial)

function applyCheckInFromToast(): void {
  confirmCheckIn()
}

function applySnoozeFromToast(): void {
  snoozePosture()
}

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('message', (event: MessageEvent) => {
    if (event.data?.type === CHECK_IN_YES_MESSAGE) {
      applyCheckInFromToast()
    }
    if (event.data?.type === SNOOZE_POSTURE_MESSAGE) {
      applySnoozeFromToast()
    }
  })
}

if (params.get('checkIn') === '1') {
  applyCheckInFromToast()
  // Drop the one-shot flag so refresh does not re-confirm.
  params.delete('checkIn')
  const next = `${window.location.pathname}${params.toString() ? `?${params}` : ''}${window.location.hash}`
  window.history.replaceState(null, '', next)
}

if (params.get('snooze') === '1') {
  applySnoozeFromToast()
  params.delete('snooze')
  const next = `${window.location.pathname}${params.toString() ? `?${params}` : ''}${window.location.hash}`
  window.history.replaceState(null, '', next)
}

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

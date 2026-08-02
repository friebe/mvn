# Stint

Ein **Stint** ist ein fester, zusammenhängender Zeitblock für deine Arbeit — ganz ohne den gehetzten Ticker- oder Pausen-Rhythmus der Pomodoro-Technik. Du widmest dich einer Aufgabe für eine längere, sinnvolle Dauer, statt im Minutentakt auf die Uhr zu schauen.

**Sit · micro-move · stand — not a focus timer.** Calm, minimal desk companion for adjustable sit/stand desks. Long sit/stand blocks, an optional ~15s micro-move when you switch the desk, then back to the next block. Body maintenance — not a Pomodoro.

Local PWA — no account, no cloud, LocalStorage only.

**UI language: English.** Micro-moments (exercises) stay in **German** for clearer body cues.

## Develop

```bash
npm install
npm run dev
```

Blog (Astro, `https://getstint.de/blog/`):

```bash
npm run dev:blog
```

Production build (app + blog → `dist/`):

```bash
npm run build
```

## Install as an app (recommended for second monitor + notifications)

Chrome/Edge on desktop:

```bash
npm run build
npm run preview
```

Then open `http://localhost:4173` → **Install app** (or browser menu “Install app”).

1. Open the installed Stint app (its own window)
2. Allow **Notifications**
3. Drag it to your second monitor

`npm run preview` after `build` is the most reliable path to install.

If you previously installed **MVN**, uninstall that PWA first — Windows keeps the old shortcut name and icon until you reinstall as **Stint**.

## Intervals

| Mode | Sit | Stand | Reset |
|------|-----|-------|-------|
| High | 30 min | 5 min | 1 min |
| Lazy | 20 min | 3 min | 1 min |

Demo mode: **Demo** button or `?demo=1`.

## Extending moments

Micro-moments live in [`src/moments.json`](src/moments.json) (for developers, not end users). Fields: `id`, `mode` (`high` | `lazy` | `both`), `kind`, `part`, `posture` (`sit` | `stand` | `either`), `title`, `prompt`. Copy is German on purpose.

## Analytics

`analytics.html` in the app folder (Analytics icon in the header): local stats for desk switches, moments, Lazy, Freeze — LocalStorage only, no cloud. Live: `https://getstint.de/analytics.html`.

## LocalStorage

Everything stays on the device. The app uses several keys:

| Key | Contents |
|-----|----------|
| `stint.v1` | Full app state (JSON blob, fields below) |
| `stint.stats.v1` | Day buckets for analytics |
| `stint-atmosphere-words-hidden` | Atmosphere text hidden (`1` / `0`) |
| `stint-pwa-installed` | Install banner marked installed |
| `stint-install-banner-dismissed` | Install banner dismissed manually |
| `stint.settings-seen` | Settings cue dismissed (`1`) |

`stint.v1` is written as a whole (settings + live session). Not every field needs its own key — this is pragmatic so a reload can resume the session.

### Settings

| Field | Meaning |
|------|---------|
| `mode` | High or Lazy (interval set) |
| `demo` | Short intervals for testing |
| `soundEnabled` | App sound on/off |
| `notificationsEnabled` | Browser toasts |
| `notificationPersistent` | Toast stays until dismiss |
| `shortcutHintsEnabled` | Keyboard hints on buttons |
| `intervals` | Custom sit/stand durations (`null` = defaults) |
| `atmosphereDisplay` | Main counter: `clock` (default), `soft`, `percent`, or `bar` (status bar only) |

### Session / progress

| Field | Meaning |
|------|---------|
| `phase` | Current phase (`setup`, `sit`, `stand`, `threshold`, `pick`, …) |
| `startedAt` | When the day started |
| `phaseEndsAt` | Wall-clock end of the current countdown |
| `phaseDurationMs` | Full duration of the current timed phase |
| `foreshadowFired` | Soft warning (~10% left) already fired |
| `endedPhase` | Which active phase just ended |
| `pendingNextPhase` | Next phase after ritual / lazy skip |
| `dayClosedKey` | Day already closed today (ISO date) |
| `northShownKey` | North-star line already shown today |

### Freeze

| Field | Meaning |
|------|---------|
| `frozenAt` | When freeze started |
| `frozenRemainingMs` | Remaining time of interrupted phase |
| `frozenPhase` | Interrupted active phase |
| `freezeExtendUntil` | “15 more min” — suppress prompt until then |
| `resumeToThreshold` | After freeze, return to threshold |
| `resumeAfterAfterplay` | After call cooldown, return to interrupted phase |

### Check-in

| Field | Meaning |
|------|---------|
| `checkInAt` | When soft check-in is due |
| `checkInShownAt` | Since when check-in is visible |
| `checkInHandled` | Already answered or timed out |

An active Yes on “Still at your desk?” or “Still standing?” counts as `desk_confirmed` (Analytics / Day close: Confirmed).

### Ritual / moments / copy

| Field | Meaning |
|------|---------|
| `momentChoiceIds` | The three moment cards in pick phase |
| `momentRerolled` | “Another moment” already used once |
| `currentExerciseId` | Currently shown moment |
| `currentMotivationId` | Currently shown motivation line |
| `ambientMotivationId` | Quiet why-line during sit/stand |
| `recentMotivationIds` | Recently shown motivations (anti-repeat) |
| `recentExerciseIds` | Recently shown moments (anti-repeat) |

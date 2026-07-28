# MVN

Elastischer Schreibtisch-Copilot für Minimal Viable Movement.

Lokale PWA — kein Account, keine Cloud, nur LocalStorage.

## Entwickeln

```bash
npm install
npm run dev
```

## Als App installieren (empfohlen für Zweitmonitor + Notifications)

Chrome/Edge auf dem Desktop:

```bash
npm run build
npm run preview
```

Dann `http://localhost:4173` öffnen → **App installieren** (oder Browser-Menü „App installieren“).

1. Installierte MVN-App öffnen (eigenes Fenster)
2. **Notifications** erlauben
3. Auf den zweiten Monitor ziehen

`npm run preview` nach `build` ist der zuverlässigste Weg zur Installation.

## Intervalle

| Mode | Sit | Stand | Reset |
|------|-----|-------|-------|
| High | 30 min | 5 min | 1 min |
| Lazy | 20 min | 3 min | 1 min |

Demo-Modus: Button **Demo** oder `?demo=1`.

## Moments erweitern

Micro-Moments liegen in [`src/moments.json`](src/moments.json) (für Entwickler, nicht Enduser). Felder: `id`, `mode` (`high` | `lazy` | `both`), `kind`, `part`, `posture` (`sit` | `stand` | `either`), `title`, `prompt`.

## Analytics

Unter `analytics.html` im App-Ordner (Icon **Analytics** im Header): lokale Statistik zu Tisch-Wechseln, Momenten, Lazy, Freeze — nur LocalStorage, keine Cloud. Auf GitHub Pages: `/mvn/analytics.html`.

## LocalStorage

Alles bleibt auf dem Gerät. Die App speichert unter mehreren Keys:

| Key | Inhalt |
|-----|--------|
| `mvn.v1` | Kompletter App-State (JSON-Blob, Felder unten) |
| `mvn.stats.v1` | Tages-Buckets für Analytics |
| `mvn-atmosphere-words-hidden` | Atmosphäre-Text ausgeblendet (`1` / `0`) |
| `mvn-pwa-installed` | Install-Banner als installiert markiert |
| `mvn-install-banner-dismissed` | Install-Banner manuell verworfen |

`mvn.v1` wird als Ganzes geschrieben (Einstellungen + laufende Session). Nicht jedes Feld müsste einzeln persistieren — das ist pragmatisch, damit ein Reload die Session fortsetzt.

### Einstellungen

| Feld | Bedeutung |
|------|-----------|
| `mode` | High oder Lazy (Intervall-Set) |
| `demo` | Kurzzeiten zum Testen |
| `soundEnabled` | App-Sound an/aus |
| `notificationsEnabled` | Browser-Toasts |
| `notificationPersistent` | Toast bleibt bis Dismiss |
| `shortcutHintsEnabled` | Tastatur-Hints auf Buttons |
| `intervals` | Eigene Sit/Stand-Zeiten (`null` = Defaults) |

### Session / Fortschritt

| Feld | Bedeutung |
|------|-----------|
| `phase` | Aktuelle Phase (`setup`, `sit`, `stand`, `threshold`, `pick`, …) |
| `startedAt` | Wann der Tag gestartet wurde |
| `phaseEndsAt` | Wall-Clock-Ende des aktuellen Countdowns |
| `phaseDurationMs` | Gesamtdauer der aktuellen timed Phase |
| `foreshadowFired` | Soft-Warnung (~10 % Rest) schon gelaufen |
| `endedPhase` | Welche aktive Phase gerade endete |
| `pendingNextPhase` | Nächste Phase nach Ritual / Lazy-Skip |
| `dayClosedKey` | Tagesabschluss schon heute (ISO-Datum) |
| `northShownKey` | Nordstern-Zeile heute schon gezeigt |

### Freeze

| Feld | Bedeutung |
|------|-----------|
| `frozenAt` | Wann Freeze startete |
| `frozenRemainingMs` | Restzeit der unterbrochenen Phase |
| `frozenPhase` | Unterbrochene aktive Phase |
| `freezeExtendUntil` | „Noch 15 Min“ — Prompt unterdrücken bis dahin |
| `resumeToThreshold` | Nach Freeze zurück zur Schwelle |
| `resumeToConfirm` | Nach Freeze zurück zur Tisch-Bestätigung |
| `resumeAfterAfterplay` | Nach Call-Nachspiel zurück zur unterbrochenen Phase |

### Check-in

| Feld | Bedeutung |
|------|-----------|
| `checkInAt` | Wann der Soft-Check-in fällig ist |
| `checkInShownAt` | Seit wann der Check-in sichtbar ist |
| `checkInHandled` | Schon beantwortet oder abgelaufen |

### Ritual / Momente / Copy

| Feld | Bedeutung |
|------|-----------|
| `momentChoiceIds` | Die drei Moment-Karten in der Pick-Phase |
| `momentRerolled` | „Anderer Moment“ schon einmal genutzt |
| `currentExerciseId` | Aktuell angezeigter Moment |
| `currentMotivationId` | Aktuell angezeigte Motivationszeile |
| `ambientMotivationId` | Ruhige Why-Zeile während Sit/Stand |
| `recentMotivationIds` | Zuletzt gezeigte Motivationen (Anti-Wiederholung) |
| `recentExerciseIds` | Zuletzt gezeigte Momente (Anti-Wiederholung) |

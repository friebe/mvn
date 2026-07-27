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

## Analytics

Unter `/analytics.html` (Link **Analytics** in der App): lokale Statistik zu Runden, Hochfahren, Lazy, Freeze — nur LocalStorage, keine Cloud.

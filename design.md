# Design — MVN

Locked design system for this app. App-shell only (no landing macrostructure).

## Genre
modern-minimal (instrument / utility restraint)

## Theme — Desk Daylight (custom)
Tageslicht-Homeoffice, Stehtisch-Instrument. Warmes Papier, ein tiefer Fichten-Akzent, trockener Desk-Tone.

- `--color-paper`     oklch(96% 0.012 95)
- `--color-paper-2`   oklch(93% 0.014 95)
- `--color-paper-3`   oklch(89% 0.016 95)
- `--color-ink`       oklch(22% 0.02 160)
- `--color-ink-2`     oklch(42% 0.018 160)
- `--color-ink-3`     oklch(58% 0.014 160)
- `--color-accent`    oklch(38% 0.06 160)
- `--color-accent-2`  oklch(48% 0.07 160)
- `--color-stand`     oklch(45% 0.08 145)
- `--color-sit`       oklch(48% 0.06 55)
- `--color-freeze`    oklch(42% 0.05 250)
- `--color-focus`     oklch(38% 0.06 160)
- `--color-danger`    oklch(48% 0.12 25)

## Typography
- Display: Fraunces (local), weight 600 — soft atmosphere label + brand (not exam mm:ss)
- Body: Source Sans 3 (local), weight 400–600
- Outlier: tabular-nums only when user taps for exact time

Ratio: major third (1.25). Measure: full viewport instrument, not prose column.

## Atmosphere
Progress is a **wash** (shell radial, phase-tinted) plus a single **desk-edge** line under the soft label — not a boxed meter or card cluster.
Hero signal = soft words in Fraunces („noch ein Stück“ / „gleich“). Exact clock is opt-in by tap.

## Motion
motion-on, restrained: phase fade, freeze pulse, attention flash, wash breathe. Respect `prefers-reduced-motion`.

## Voice
utilitarian · dry desk-worker · no wellness kitsch · no streaks · Tisch-Metapher

## Slop gates
- No purple, no cream+terracotta cliché, no broadsheet, no card clusters, no dark-mode default
- Brand MVN hero-level in first viewport
- Tokens only — no mid-render hex improvisation
- Moment pick = text list, not cards

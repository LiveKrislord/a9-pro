# A9 Pro — hidden mechanics

A minimal, dark-only PWA that documents Asphalt 9 Legends mechanics: what to press on Xbox, DualSense and keyboard, a timed playback of the inputs, and a "test yourself" drill that scores your real inputs.

## Run

```
npm install
npm run dev      # local dev server
npm run build    # static output in dist/
npm run icons    # regenerate public/icon-*.png
```

Deploys to GitHub Pages on every push to `main` (see `.github/workflows/deploy.yml`). Enable Pages with source "GitHub Actions" in the repo settings.

## Adding a mechanic

Create `src/content/<id>.md`. Frontmatter defines the drill, the Markdown body is the explanation.

```md
---
id: dogcatch
title: Dogcatch
category: Landing
summary: One line shown under the title.
params:                       # optional, user-selectable before the drill
  airtime:
    label: Airtime
    default: 2000
    options:
      - { label: 1 s, value: 1000 }
      - { label: 2 s, value: 2000 }
sequence:
  - { id: tap1, do: tap, action: drift, label: Drift tap 1 }
  - { id: tap2, do: tap, action: drift, after: tap1, at: 120, window: [0, 250] }
  - { id: landing, do: marker, label: Wheels touch ground, after: tap2, at: "{airtime}" }
  - { id: catch, do: hold, action: drift, after: landing, at: 140, window: [50, 300], heldUntil: end, requires: [steer] }
end: { after: landing, at: 700 }
---
Body text in Markdown.
```

Step fields:

| field | meaning |
| --- | --- |
| `do` | `tap`, `hold` or `marker` (a labelled moment with no input, e.g. touchdown) |
| `action` | `accelerate`, `brake`, `drift`, `nitro`, `steer-left`, `steer-right`. May contain `{param}`. |
| `after` | id of the reference step. Defaults to the previous step. |
| `at` | nominal offset in ms from the reference step, used for playback. May contain `{param}`. |
| `window` | `[min, max]` ms from the reference step in which the press counts. `start` / `end` are open bounds. Default is `at ± 150`. |
| `heldUntil: end` | the hold must persist until the drill ends. |
| `requires` | step ids whose action must be down at the moment of this press. |
| `tapMs`, `holdMs` | playback press lengths (defaults 80 / 400). |

The first step is the trigger: the drill starts on its first press. `end` sets when the drill stops, relative to a step.

Bindings live in `src/mapping.ts`. They are placeholders until confirmed against the real in-game layout.

# A9 Pro: hidden mechanics

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

## Loop drills

A mechanic can be a repeating drill instead of a fixed sequence. Set `type: loop`, keep `sequence: []`, and describe the loop:

```yaml
type: loop
params:
  duration: { label: Duration, default: 10000, options: [{ label: 10 s, value: 10000 }] }
  speed: { label: Speed, default: 250, options: [{ label: 250 km/h, value: 250 }] }
loop:
  action: drift        # the action that is held or tapped each round
  minMeters: 25        # distance window per round
  maxMeters: 35
  speedParam: speed    # param that gives km/h, used to turn meters into milliseconds
  durationParam: duration
  gapNitro: required   # or optional: exactly one nitro tap between rounds
  driftAfterNitroMs: 200   # the next round must start this soon after the nitro tap
```

The clock starts on the first press and the run passes when the duration is reached. The first drift outside the window, or a gap that breaks the nitro rule, ends the run. In One tap drift mode a round ends on the next drift or nitro press.

## Count drills

For moves that are scored by how many you can do, set `type: count`:

```yaml
type: count
params:
  duration: { label: Duration, default: 10000, options: [{ label: 10 s, value: 10000 }] }
count:
  entry: { action: drift, label: Brake into the corner }   # optional: one press that opens the run
  pattern:                                                  # the presses that repeat; each pass counts one
    - { action: nitro, label: Punch nitro }
    - { action: drift, label: Brake back into the drift }
  durationParam: duration
  requireHeld: ["steer-{side}"]   # optional: presses count only while these are held
  unitLabel: Punch drifts          # optional: name for one completed pattern
  maxGapMs: 300                    # optional: inside a pass, each press must follow the previous this fast
  chain: separate                  # or overlap: the closing press also opens the next pass when first and last actions match; resting after a completed link is allowed
```

Order only, no timing windows. The clock starts on the entry press, or on the first press of the pattern when there is no entry, and the run always passes when time is up. Every completed pass through the pattern counts. A press out of order, or one made without the `requireHeld` actions held, ends the run as a fail, and the count so far is still recorded. When a pattern starts and ends with the same action, the closing press also opens the next repetition. The count is kept as the personal best.

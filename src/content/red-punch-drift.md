---
id: red-punch-drift
title: Red punch drift
category: Make it float
summary: The punch drift with a double nitro tap in every punch.
type: count
params:
  duration:
    label: Duration
    default: 10000
    options:
      - { label: 5 s, value: 5000 }
      - { label: 10 s, value: 10000 }
      - { label: 20 s, value: 20000 }
  side:
    label: Corner side
    default: right
    options:
      - { label: Left, value: left }
      - { label: Right, value: right }
sequence: []
count:
  requireHeld: ["steer-{side}"]
  entry: { action: drift, label: Brake into the corner }
  pattern:
    - { action: nitro, label: "Nitro, first tap" }
    - { action: nitro, label: "Nitro, second tap" }
    - { action: drift, label: Brake back into the drift }
  durationParam: duration
  unitLabel: Red punch drifts
---

## What it is

The red punch drift is the punch drift with a stronger punch. Instead of one nitro tap between the brakes you tap nitro twice, which fires the red, double-tap nitro. Everything else is the same: stick pinned toward the corner, brake into the drift, then nitro, nitro, brake, again and again until the corner is done.

The extra push is bigger, so the car drifts away from the inside of the corner more than with the plain punch drift. Give it more room on the outside.

## How to do it

1. Push the stick fully toward the corner and keep it there.
2. Tap brake to start the drift. The clock starts on that press.
3. Tap nitro twice, quickly.
4. Tap brake to go back into the drift.
5. Nitro, nitro, brake. Repeat until you are through.

## Reading the drill

One brake opens the corner, and after that every nitro, nitro, brake with the stick held counts as one red punch drift. Inside a punch each press has to follow the previous one within 300 ms, so a slow second nitro or a late brake ends the run. Between punches there is no limit. A single nitro followed by brake is the plain punch drift and ends this run, and so does a third nitro tap or a press with the stick let go. The results list every completed punch and the record line keeps your best count.

## Common mistakes

- Only one nitro tap. That is the plain punch drift.
- Three nitro taps, which resets the pattern.
- Letting the stick drift back to center.

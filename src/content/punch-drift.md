---
id: punch-drift
title: Punch drift
category: Make it float
summary: Full steer into the drift, then nitro, brake, nitro, brake through the corner.
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
    - { action: nitro, label: "Punch nitro, one tap" }
    - { action: drift, label: Brake back into the drift }
  durationParam: duration
  unitLabel: Punch drifts
video: { youtube: aI_FjJyEcoc, credit: "Unknown is Live" }
---

## What it is

A punch drift is a drift with nitro punches inside it. You steer fully into the corner and tap brake to start the drift, then tap nitro, brake, nitro, brake, over and over, until the corner is done. Each nitro tap punches the car forward while it is sideways and each brake pulls it back into the drift. It is the mirror image of the brake-nitro trick: there you brake and then fire nitro, here you fire nitro and then brake, and you keep alternating.

It is one of the fastest ways through a long corner, which is why it is the most asked-about move in the game.

## How to do it

1. Push the stick fully toward the corner and keep it there for the whole corner.
2. Tap brake to start the drift. The clock starts on that press.
3. Tap nitro once.
4. Tap brake to go back into the drift.
5. Nitro, brake, nitro, brake. Keep alternating until you are through.

## Watch the walls

Every punch pushes the car away from the inside of the corner. On a right-hander with a wall close on the left, a chain of punches can carry you into that wall. Use it where there is room on the outside, or cut the chain short when the track is narrow.

## Reading the drill

One brake opens the corner, and after that every nitro, brake pair with the stick held toward the corner counts as one punch drift. The brake has to follow the nitro within 300 ms, so a nitro left hanging ends the run. A press out of order ends it too, and so does a press made with the stick let go. Between two punches there is no limit, so you can take a breath before the next nitro. When time is up, the results list every punch with the moment it completed, and the record line keeps your best count for that duration.

## Common mistakes

- Two nitro taps in a row. That is the red punch drift, a different move with its own drill.
- Forgetting the brake between two nitro taps.
- Easing off the stick mid-corner. Keep it pinned.
- Holding the buttons. All of them are taps.

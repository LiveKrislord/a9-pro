---
id: dogcatch
title: Dogcatch
category: Gain momentum
summary: Land a 360 with the nose already drifting into the corner exit.
params:
  airtime:
    label: Airtime
    default: 2000
    options:
      - { label: 1 s, value: 1000 }
      - { label: 2 s, value: 2000 }
      - { label: 3 s, value: 3000 }
  side:
    label: Exit side
    default: right
    options:
      - { label: Left, value: left }
      - { label: Right, value: right }
sequence:
  - { id: tap1, do: tap, action: drift, label: Drift tap 1, short: Tap }
  - { id: tap2, do: tap, action: drift, label: Drift tap 2 (starts the 360), short: Tap, after: tap1, at: 80, window: [0, 150] }
  - { id: landing, do: marker, label: Wheels touch ground, short: Land, after: tap2, at: "{airtime}" }
  - { id: steer, do: hold, action: "steer-{side}", label: Stick toward exit, short: Stick, after: landing, at: -300, window: [start, 150], heldUntil: end }
  - { id: catch, do: hold, action: drift, label: Drift (dogcatch), short: Drift, mark: true, after: landing, at: 100, window: [50, 150], heldUntil: end, requires: [steer] }
end: { after: landing, at: 200 }
video: { youtube: YH2ectxwlnc, credit: "A.9.U.F™ ORION", note: "Skip to 0:14 for fast introduction" }
---

## What it is

A dogcatch is a landing where the car touches down with its nose already pointed and drifting toward the corner exit. You trigger a 360 off the ramp, and the instant the wheels touch the ground you push the stick toward the exit side and press drift. The car carries the spin straight into a drift instead of landing flat.

## How to do it

1. Off the ramp, double-tap drift to start the 360.
2. While airborne, push the stick toward the exit side. Early is fine, it does nothing until you land.
3. The moment the wheels touch, press drift. With the hold drift setting, keep it held. With one-tap drift, a single tap is enough.

## Reading the drill

The line is the drill, from your first drift tap to the end. The dot runs along it, and the ring marks the moment to press drift: just after touchdown, at the airtime you chose. Your press has to come 50 to 150 ms after the wheels touch, with the stick already held. Pressing drift before that window, or after it, fails the drill. The results table shows your timing next to the allowed window for every step. The whole mechanic is a reaction to the landing, not an anticipation.

## Common mistakes

- Pressing drift before the wheels touch.
- Letting go of the stick before pressing drift.
- With hold drift, letting go of drift right after landing. Keep it held.

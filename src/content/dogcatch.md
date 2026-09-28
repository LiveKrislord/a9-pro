---
id: dogcatch
title: Dogcatch
category: Landing
summary: Land from a 360 with the nose already drifting toward the corner exit.
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
  - { id: tap1, do: tap, action: drift, label: Drift tap 1 }
  - { id: tap2, do: tap, action: drift, label: Drift tap 2 (starts the 360), after: tap1, at: 120, window: [0, 250] }
  - { id: landing, do: marker, label: Wheels touch ground, after: tap2, at: "{airtime}" }
  - { id: steer, do: hold, action: "steer-{side}", label: Stick toward exit, after: landing, at: -300, window: [start, 300], heldUntil: end }
  - { id: catch, do: hold, action: drift, label: Drift (dogcatch), after: landing, at: 140, window: [50, 300], heldUntil: end, requires: [steer] }
end: { after: landing, at: 700 }
---

## What it is

A dogcatch is a landing where the car touches down with its nose already pointed and drifting toward the corner exit. You trigger a 360 off the ramp, and the instant the wheels touch the ground you push the stick toward the exit side and press drift. The car carries the spin straight into a drift instead of landing flat.

## How to do it

1. Off the ramp, double-tap drift to start the 360.
2. While airborne, push the stick toward the exit side. Early is fine, it does nothing until you land.
3. The moment the wheels touch, press and hold drift.

## Reading the drill

The timeline starts on your first drift tap. The dashed line is touchdown, at the airtime you chose. The shaded band after it is the reaction window: your drift press has to land inside it, with the stick already held. It opens 50 ms after touchdown. Pressing drift before that fails the drill. The whole mechanic is a reaction to the landing, not an anticipation.

## Common mistakes

- Pressing drift before the wheels touch.
- Letting go of the stick before pressing drift.
- Tapping drift instead of holding it. Keep it held through the landing.

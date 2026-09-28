---
id: 360-float
title: 360 float
category: Make it float
summary: Spin a 360 away from the corner, then steer hard into it as the spin ends.
params:
  side:
    label: Corner side
    default: left
    options:
      - { label: Left, value: left }
      - { label: Right, value: right }
  spin:
    label: Spin time
    default: 1000
    options:
      - { label: 0.8 s, value: 800 }
      - { label: 1.0 s, value: 1000 }
      - { label: 1.2 s, value: 1200 }
derived:
  away: { from: side, map: { left: right, right: left } }
sequence:
  - { id: tap1, do: tap, action: drift, label: Drift tap 1, short: Tap }
  - { id: prep, do: hold, action: "steer-{away}", label: Stick away from the corner, short: Stick, after: tap1, at: -200, window: [start, 0], holdMs: "{spin}" }
  - { id: tap2, do: tap, action: drift, label: Drift tap 2 (starts the 360), short: Tap, after: tap1, at: 80, window: [0, 150], requires: [prep] }
  - { id: spinEnd, do: marker, label: 360 about to end, short: End, after: tap2, at: "{spin}" }
  - { id: steer, do: hold, action: "steer-{side}", label: Strong steer into the corner, short: Steer, mark: true, after: spinEnd, at: -100, window: [-250, 100], heldUntil: end }
end: { after: spinEnd, at: 500 }
---

## What it is

The 360 float is the easiest float in the game. Coming up to a corner, you spin the car a full 360 away from the corner, and just as the spin is about to finish you steer hard into the corner. The car comes out of the spin already floating and pointed the right way.

The spin goes the opposite way to the corner. For a left corner the nose turns clockwise, so the stick goes right. For a right corner it is the mirror image.

## How to do it

1. Line up close to the inside edge of the corner, so the spin does not cost you distance.
2. Hold the stick away from the corner. Right for a left corner.
3. Double-tap drift. The 360 starts on the second tap.
4. As the spin is about to end, slam the stick into the corner and hold it.

## Reading the drill

The clock starts on your first drift tap. The stick has to be away from the corner before the second tap, or the spin goes the wrong way. The dashed moment on the line is where the 360 is about to end, at the spin time you chose, and the ring marks the strong steer, which has to start between 250 ms before that moment and 100 ms after it. Hold the steer to the end of the drill. The results show your double-tap gap and how close to the end of the spin you steered.

## Common mistakes

- Spinning toward the corner instead of away from it.
- Steering into the corner too early, while the car is still mid-spin.
- Waiting until the spin has fully stopped. The steer has to catch it as it ends.
- Taking the corner wide. Stay near the inside edge so the spin costs nothing.

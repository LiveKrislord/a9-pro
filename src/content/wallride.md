---
id: wallride
title: Wallride nitro
category: No speed lose
summary: Ride the wall and farm nitro with short brake drifts.
type: loop
params:
  duration:
    label: Duration
    default: 10000
    options:
      - { label: 5 s, value: 5000 }
      - { label: 10 s, value: 10000 }
      - { label: 20 s, value: 20000 }
  speed:
    label: Speed
    default: 400
    custom: { min: 100, max: 700, unit: km/h }
    options:
      - { label: 350 km/h, value: 350 }
      - { label: 400 km/h, value: 400 }
      - { label: 450 km/h, value: 450 }
      - { label: 500 km/h, value: 500 }
      - { label: 550 km/h, value: 550 }
sequence: []
loop:
  action: drift
  minMeters: 25
  maxMeters: 35
  speedParam: speed
  durationParam: duration
  gapNitro: required
  driftAfterNitroMs: 200
video: { youtube: VaoDOH6-U3E, credit: "Azimo (Azi)", note: "Skip to 0:20 for the wallride part" }
---

## What it is

A wallride is when you lean the car against the wall on a medium bend and let the wall do the steering. You keep your speed through the curve without a real drift, which matters most in cars that cannot hold a drift well or that run out of nitro fast. Quick, well-handling cars rarely need it. Fast cars in the upper B, A and S classes benefit the most.

The bonus is nitro. While the wall carries the car, short brake taps count as drifts and fill the nitro bar. Chain them and you come off the wall with more nitro than you had going in. That chain is what this drill trains.

## How to do it

1. Get the car onto the wall and keep the stick centered. Steering or tilting into or away from the wall bleeds speed.
2. Tap brake to start a drift and keep it going for 25 to 35 meters, no more. The clock starts on that first press.
3. End the drift. With the hold drift setting, release the button. With one-tap drift, the next nitro or brake press ends it.
4. Tap nitro once, then hit brake again straight away. The next drift has to start within 200 ms of the nitro tap.
5. Drift again for 25 to 35 meters. Keep the rhythm going until the time you picked runs out.

## Reading the drill

The app measures time, not distance, so pick the speed your car holds on the wall. At that speed, 25 to 35 meters is a fixed hold window, and the step list shows it in milliseconds. The line is the whole run and the dot travels along it from your first press to the end. A drift that is too short or too long stops the run at once, and so does a gap with no nitro tap or with more than one. The results table lists every drift and gap with its length.

## Common mistakes

- Holding the drift past 35 meters. The run ends the moment the hold is too long.
- Letting go before 25 meters.
- Starting the next drift without the nitro tap in between.
- Pausing after the nitro tap. Brake again the moment you tap it.
- Steering while on the wall. Hold the stick still and let the wall guide the car.
- Choosing a speed that does not match your car, which shifts the whole window.

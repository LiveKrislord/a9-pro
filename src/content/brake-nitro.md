---
id: brake-nitro
title: Brake nitro
category: No speed lose
summary: Nitro, brake, nitro, brake, nitro. Chain it as fast as you can.
type: count
params:
  duration:
    label: Duration
    default: 10000
    options:
      - { label: 5 s, value: 5000 }
      - { label: 10 s, value: 10000 }
      - { label: 20 s, value: 20000 }
sequence: []
count:
  pattern:
    - { action: nitro, label: Nitro tap }
    - { action: drift, label: Brake tap }
    - { action: nitro, label: Nitro tap again }
  durationParam: duration
  unitLabel: Brake nitros
  maxGapMs: 300
  chain: overlap
---

## What it is

The brake nitro is the first hidden mechanic most players learn, and the easiest one to pull off. Three quick taps: nitro, brake, nitro. The brake tap in the middle starts a tiny drift and the second nitro fires the car out of it, so you keep your speed and get a push instead of losing pace to the brake. It works on straights and gentle bends, anywhere you have nitro to spend.

## How to do it

1. Tap nitro. The clock starts on that tap.
2. Tap brake within 300 ms.
3. Tap nitro again within 300 ms of the brake.

4. Keep going: brake, nitro, brake, nitro. Every closing nitro is the opening nitro of the next one, so the chain is just S, Space, S, Space as fast as your hands allow. The faster, the better.

## Reading the drill

Every brake that sits between two nitros, with both gaps under 300 ms, counts as one brake nitro. In a chain each nitro closes one and opens the next. A gap longer than 300 ms inside the chain ends the run, and so does a press out of order, like two brakes in a row. After a nitro you may stop and start again with a fresh nitro whenever you like. The results list every completed brake nitro with the moment it finished, and the record line keeps your best count for that duration.

## Common mistakes

- Too slow between the taps. Each one has to follow the last within 300 ms.
- Brake first. The move opens with nitro.
- Only one nitro. The second nitro is what turns the brake into a push.

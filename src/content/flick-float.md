---
id: flick-float
title: Flick float
category: Make it float
summary: Flick the stick away from the corner for a split second, then slam it in. The front lifts and the car floats.
params:
  side:
    label: Corner side
    default: left
    options:
      - { label: Left, value: left }
      - { label: Right, value: right }
derived:
  away: { from: side, map: { left: right, right: left } }
sequence:
  - { id: flick, do: hold, action: "steer-{away}", label: Flick away from the corner, short: Flick, holdMs: 75, holdWindow: [50, 100] }
  - { id: steer, do: hold, action: "steer-{side}", label: Strong steer into the corner, short: Steer, mark: true, after: flick, at: 85, window: [50, 160], heldUntil: end }
end: { after: flick, at: 600 }
video: { youtube: vkY-8aTcWgM, credit: "A³_Official" }
---

## What it is

The flick float turns the car's own weight against it. Going into a corner, you flick the stick the wrong way for a split second, then slam it back toward the corner. The car wants to follow the flick, gets yanked the other way, and the twist tries to roll it over. The game never lets a car flip, so the energy goes somewhere else: the front wheels lift and the car floats through the corner while it turns.

It works best in long cars such as the Devel Sixteen, the Trion Nemesis and the Mosler. Shorter cars barely react.

## How to do it

Two quick beats. Tak, tak.

1. Corner on the left: flick the stick fully right and let go within 50 to 100 ms. The clock starts on the flick.
2. The moment it comes back, slam the stick fully left and keep it there.

For a right corner, mirror it: flick left, then hold right.

## Reading the drill

The line is the drill from the flick to the end. The ring marks the strong steer, which has to start 50 to 160 ms after the flick began. The flick itself must last 50 to 100 ms: shorter and the car never loads up, longer and it just turns the wrong way. The steer into the corner has to stay held to the end of the drill. The results show how long you held the flick and how quickly the steer followed.

## Common mistakes

- Holding the flick too long. Anything past 100 ms is a steer, not a flick.
- A soft flick. The stick has to reach full lock both ways.
- A pause between the two beats. The steer must follow the flick at once.
- Letting the steer go early. Hold it through the float.

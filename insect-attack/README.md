# Insect Attack

A playable reconstruction of Michael King's Commodore 64 game design, recovered from handwritten notebook pages. The implementation is modern, dependency-free JavaScript, but keeps the documented premise, scoring, scrolling farmland, limited-range spray, helicopter lives, insect behaviors, and pixel-art presentation.

## Play

Open `index.html` in a modern browser. No installation or server is required.

- Move: arrow keys or WASD
- Spray: Space or Z
- Pause: P
- Mute: M
- From the title screen, keys 1–9 select a starting wave; Enter starts at wave 1.

## Notebook interpretation

The notes specify a crop-spraying helicopter over Kansas, three copters, a 30-level progression, a short-range spray, scrolling farms, and insects that can steal farms. The five documented insects have distinct movement and values: dragonfly (50), bee (100), wasp (150), hornet (200), and fly (250). Their new silhouettes are drawn from individual pixel clusters in a restricted C64-style palette. Some pages contain revisions, so later, more explicit notes were preferred where values conflict.

For play balance, insects select a behavior when they enter: farm raiders deliberately descend toward an available farm, attackers pursue the helicopter with a weaving approach, and roamers use their species pattern. Each wave has its own score goal, avoiding the old cumulative-score skip that could chain waves immediately. Completing a wave plays a short fanfare and shows a brief wave card before play continues; there is no return to the title or victory screen between waves. Later waves spawn more often, introduce stronger species, and increase insect speed and pursuit. After the notebook's 30-wave framework, the run continues as an endless survival mode. The game-over screen appears only after all three copters are lost.

Original notebook photographs are kept in the local workspace and are intentionally excluded from this public repository. Notes about other games were not used by this implementation.

## Sound

The effects are generated in real time with the browser Web Audio API. Short square, sawtooth, triangle, and noise voices with simple envelopes evoke the C64 SID without copying external samples. Browsers require a key press before audio begins; starting the game satisfies that requirement.

The game also has an original horror/science-fiction background pattern: chromatic saw/pulse figures, triangle sub-bass and sparse noise percussion. It is deliberately stranger and more mechanical than the other games' music.

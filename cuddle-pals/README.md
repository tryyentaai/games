# Cuddle Pals

A gentle virtual-pet game for ages 3–6. Adopt a baby pony, kitty or puppy, then keep it fed, clean, rested and happy. Pets never get sick, never run away, and nothing can be lost.

## How it plays
- **Pick a pet.** Three babies sit in baskets. Tap one. The dice gives new colors.
- **Four needs**, shown as rings at the top and big buttons at the bottom:
  - **Food:** the pet's thought bubble shows what it wants. Drag or tap the matching food. A wrong pick bounces back with a polite head shake; after two misses only the right food stays.
  - **Bath:** rub the mud spots off. Bubbles, a rinse, then sparkles.
  - **Sleep:** lights dim and a music box plays. Tap the stars while the pet naps, or tap the sun to wake it.
  - **Play:** pop 10 balloons. Once a kid is quick, the pet asks for one color ("Pop the pink ones!").
- **Tap the pet** for cuddles and giggles.
- **Party:** when all four rings are full, the pet throws a party and hands over a present. Every present is a new outfit (14 total: bow, crown, pumpkin hat, heart glasses, bell collar…). Pets grow bigger after their 2nd and 5th party.
- After the party the game stops and offers a calm choice: **More** or **Night night**. Nothing auto-starts.
- Up to 6 pets (paw button). Dress-up lives behind the bow button.

## Help without words
First run shows a hand on the pet, then on the button to press. After 5 s idle the next useful thing pulses; after 10 s the voice gives a nudge and the hand shows the move. The **?** button jumps straight to the next hint. Reading is never needed.

## Install on iPhone or iPad
1. Open https://tryyentaai.github.io/games/cuddle-pals/ in Safari.
2. Tap Share → **Add to Home Screen**.
3. Launch it once while online so it caches for offline play.

Tip: Settings → Accessibility → **Guided Access** keeps a kid inside the game.

## Grown-ups panel
Press and hold the gear (top left) for 2 seconds. Sound, music, voice, help level (Normal/Extra), kid's name (shown on the party card), pet's name, and an optional bedtime nudge.

## The voice
Every spoken line is a recording from a natural-sounding neural voice (89 lines in `voice.mp3`, rendered offline with Kokoro: af_heart narrates, the pet is af_bella pitched up). The phone's robot voice is never used. Because lines are pre-recorded, the kid's name appears on the party card instead of being spoken; pet names are from a fixed list of 16 so the voice can say them.

## Privacy
No ads, purchases, links, accounts or data collection. Art, music and sound effects are generated in code. Progress is saved only on this device.

## For developers
Single file `index.html`. Save key: `cuddle-pals.save.v1`. Service worker cache prefix `cp-` (bump `VERSION` in `sw.js` on every change). `?icon=1` renders the icon art.
`window.CP` exposes `G`, `S`, and `api`: `state()`, `tap(x,y)`, `down/move/up`, `step(sec,fps)`, `press(id)`, `btns()`, `act(need)`, `setNeeds(obj)`, `feed()`, `balloons()`, `play()`, `bath()`, `pet()`, `voice()`, `resetStats()`.

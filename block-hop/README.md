# Block Hop

A blocky obstacle-course runner for ages 5–7. Your hero runs on their own; tap anywhere to hop over gaps, onto steps and past hot blocks, grab coins, and reach the trophy. Coins buy new looks in the closet. There is no way to lose.

## How it plays
- **One move: tap to jump.** Tap again in the air for a double jump.
- **5 worlds × 4 levels**, each world adds one new idea:
  - **Green Hills:** gaps, steps, little islands
  - **Candy Town:** hot blocks (always the glowing orange-red ones: jump over)
  - **Sky Islands:** bounce pads that launch you, islands at different heights
  - **Lava Peak:** moving blocks
  - **Snow Fort:** wobbly ice blocks that drop behind you, plus a bit of everything
- **Coins sit on the jump arc**, so they show where to hop.
- **Streaks** pop Nice → Great → Super → Amazing → LEGENDARY, and a 6-in-a-row streak sets off a rainbow star moment and a coin shower. Some levels hide a big golden coin.
- **Closet (Look):** shirt color, hats, faces, back items, trails and skin colors. Finishing each world gives a free prize (crown, wings, rainbow trail, rocket, galaxy shirt).
- After each level a party card offers **Again / Next / Home**. Nothing starts by itself.

## Never stuck, never fails
- A fall or a hot block is just a poof; you are back at the last checkpoint and running again in about 1 second. Every obstacle is its own checkpoint.
- After two misses in a row, golden bridge blocks fill in the next try, so there are never three misses in a row.
- Hidden help adjusts by itself: early taps are timed to the right spot, late taps still count for a moment, and the hero drifts toward safe ground in the air. Difficulty rises after easy wins and eases after struggles, silently.
- First run: the game pauses at the first gap and a hand shows the tap. The **?** button shows where to jump (and slows down); press it again for a bridge.

## Install on iPhone or iPad
1. Open https://tryyentaai.github.io/games/block-hop/ in Safari.
2. Tap Share → **Add to Home Screen**.
3. Launch it once while online so it saves itself for offline play.

Tip: Settings → Accessibility → **Guided Access** keeps a kid inside the game.

## Grown-ups panel
Press and hold the gear on the home screen for 2 seconds. Sound, music, voice, help level (Normal / Extra / Max), kid's name (shown on the home screen and party card), an optional "all done" nudge after 3, 5 or 8 levels, and a hold-to-reset.

## The voice
Every spoken line is a recording from a natural-sounding neural voice (37 short lines in `voice.mp3`, rendered offline with Kokoro, voice af_heart). The phone's robot voice is never used. Because lines are pre-recorded, the kid's name is shown rather than spoken.

## Privacy
No ads, purchases, links, accounts or data collection. Art, music and sound effects are made in code. Progress is saved only on this device.

## For developers
Single file `index.html`. Save key `block-hop.save.v1`. Service worker cache prefix `bh-` (bump `VERSION` in `sw.js` on every change). `?icon=1` renders the icon art.
`window.BH` exposes `G`, `S`, `CFG` and `api`: `state()`, `start(world,stage)`, `step(sec)`, `tap()`, `press(id)`, `btns()`, `nextTx()`.

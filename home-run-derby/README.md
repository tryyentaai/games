# Moonshot Derby

A one-tap home run derby built for a 5-year-old. Tap anywhere to swing. No reading, no losing, no ads, no purchases, no internet needed after the first load.

## Install on iPhone or iPad

1. Open the game's GitHub Pages link in Safari.
2. Tap Share, then **Add to Home Screen**.
3. Launch it from the home screen icon. It opens full-screen and plays offline from then on.

Hold the gear in the top-right corner of the title screen for 2 seconds to open the **Grown-ups** settings: sound, music, announcer voice, batting help, the player's name for the announcer, and an optional "last round" reminder.

Tip: turn on Guided Access (Settings › Accessibility › Guided Access, then triple-click the side or top button) so he can't swipe out of the game.

## How it plays

- A friendly pitching robot winds up with a sound and a glow, then lobs a slow pitch that hangs in a glowing ring. Tap when the ring lights up.
- A hidden assist keeps the home run rate around 75% and never allows three non-homers in a row. Better timing hits the ball farther, up to 530 ft.
- Every homer gets the crack, a slow-motion ball cam, fireworks, a cheering crowd, and the announcer.
- Surprises: golden balls, outfield targets (blimp, donut sign, big screen), and a MEGA HOMER after three homers in a row.
- Rounds are 10 swings and end with a party. New items arrive as presents he taps open, then a calm "again?" choice. Nothing auto-starts.
- The house button leaves a round only when held for about a second, so a stray tap near the corner just swings.
- If anything ever goes wrong, the game drops back to the title screen instead of freezing.
- Home runs add up forever and unlock 8 bats, 6 balls, 5 stadiums, plus 8 shirt colors from the start.

## Files

| File | Purpose |
| --- | --- |
| `index.html` | The whole game: canvas art, synthesized sound, game logic |
| `manifest.webmanifest` | Home screen app settings |
| `sw.js` | Offline cache. Cache names start with `hrd-` so other games in the repo are untouched |
| `icon-180.png`, `icon-192.png`, `icon-512.png` | App icons |

Progress is saved only on the device, in `localStorage` under the key `hrd.save.v1`. When you change the game, bump `VERSION` in `sw.js` so devices pick up the new copy.

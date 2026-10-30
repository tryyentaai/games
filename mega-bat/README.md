# Mega Bat

The pitcher lobs, you tap to swing, and Dinger (a giggling baseball) rockets off the bat and bounces through trampolines, balloons, zoom pads, slides and wind clouds. Clear the big **HOME RUN** sign at 560 ft for fireworks. Every hit ends in a party. Built for age 5 (no reading, one tap), with a deeper layer for 7-9 (Pro swing, saving boosts). A baseball cousin of Mega Kick.

## How it plays
- **First launch:** the announcer asks "Boy or girl?" Tap a card to hear it and see it light up; tap again (or wait a second) to pick. A short movie plays: the pitch, a slow-motion swing, **BOOM**, and a flight into a giant target about 1,200 ft away. Tap after 2 seconds to skip it.
- **Swing (Easy, default):** Bruno the bear (Bun-Bun the bunny in Girl mode) winds up and lobs a slow pitch. A ring closes in on the plate and glows gold at the perfect moment. Tap any time during the pitch: tap early and the batter loads up and swings right on time (a little lower hit); tap near the glow for a **PERFECT!** hit. The very first swing is always perfect.
- **Swing (Pro):** the swing happens exactly when you tap, so timing sets the angle and the power. Offered once with a **Pro?** button after 15 hits, but only to a kid who is already timing swings well, or set it in the grown-ups panel. After two pitches without a swing, Pro forgives early taps so nobody gets stuck.
- **Didn't swing?** No problem. The ball rolls into the backstop and the next pitch comes in under 2 seconds. After 2 quiet pitches the hand shows when to tap and the pitches get slower; after 3, the pitcher waits for a tap.
- **Rocket boosts:** 3 per hit (rocket icons, top left). Tap during flight for a boost puff. Boosts are biggest when Dinger is low and slow, so saving one is the smart play.
- **Home run:** pass the HOME RUN sign (560 ft) for a banner, fireworks and a cheering crowd. A hidden helper means there are never 3 hits in a row without a home run.
- **Party:** the distance counts up, then a tier: Nice! → Great! (600 ft) → Super! (900) → AMAZING! (1,400) → LEGENDARY! (2,400). The announcer says roughly how far it went. Then one big **Again?** button. Nothing starts by itself.
- **No-fail:** no lives, no strikes, no outs, no timers, no game over.

### World zones (every 1,000 ft)
| | Boy mode | Girl mode |
|---|---|---|
| 0 | Ball Park | Ball Park |
| 1,000 | Dino Valley | Flower Meadow |
| 2,000 | Volcano Hills | Cupcake Hills |
| 3,000 | Rocket Sky | Rainbow Sky |
| 4,000+ | Moon | Star Castle |

### Rewards
- **Sticker book (24):** first hit, first bullseye, 25 home runs, gold stars, 1,000-4,000 ft, balloon pops, a last-second boost, boings, slides, splats, flumps, and every world zone in each mode.
- **Balls** unlock with total feet hit: Fire Stripes, Rainbow, Star, Planet, Glitter Gold, Dino Egg, Cupcake, Moon, Comet.
- **Bats** (colors) unlock at 4, 8, 12, 16 and 20 stickers.
- A **Best** flag stands on the field at the kid's record.

## The voice
Every spoken line is a recording made with a natural-sounding neural voice (173 lines in `voice.mp3`). The phone's built-in robot voice is never used. Because the lines are recorded ahead of time, the announcer can't say the kid's name; the name shows on the party card instead ("Home run, Leo!").

## Install (iPhone / iPad)
1. Open the game link in **Safari**.
2. Tap **Share** → **Add to Home Screen**.
3. Launch it once while online. After that it works offline.

## Grown-ups panel
**Press and hold the gear (top right of the title screen) for 2 seconds.**
- Sound effects, music, voice on/off
- Swing style: Easy / Pro
- Assist: Gentle / Normal / Off
- Kid's name (shown on the party card)
- Batter skin tone, hide boy/girl switch
- Last-hit reminder: off, or after 5 / 10 / 15 hits, then a calm "All done!" screen
- Reset progress: hold 2 s, then hold again to confirm

No ads, purchases, links, accounts or data collection. Art, music and sound effects are generated in code; the voice is a recorded file stored with the game. Progress is saved only on this device.

## Tips
- The **iPhone silent switch** can mute game sounds. Flip it if there is no sound.
- **Guided Access** keeps your kid in the game: Settings → Accessibility → Guided Access → On, then triple-click the side button inside the game.

## For developers / QA
`window.MB` exposes `G`, `S`, `sim(opts)` (pass `timing` in seconds, + = late), plus `tap()`, `state()`, `step(frames)`, `tick(seconds)`, `swing(e, seed)`, `pitchClock()`, `boost()`, `play()`, `again()`, `home()`, `skipIntro()`, `setSave(obj)`, `voice()`. Save key: `mega-bat.save.v1`. Service worker cache prefix: `mb-` (bump `VERSION` in `sw.js` on every change). `?icon=1` renders the icon art. Voice lines were rendered offline with Kokoro (af_heart; Dinger is af_bella pitched up).

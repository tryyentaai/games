# Mega Kick

Kick Bouncy, a giggling soccer ball, as far as he can fly. Bouncy hits trampolines, balloons, zoom pads, slides and wind clouds that send him farther. He always lands somewhere soft and silly, and every kick ends in a party. Built for age 5 (no reading, one tap), with a deeper layer for 7-9 (Pro kick, saving boosts).

## How it plays
- **First launch:** the voice asks "Boy or girl?" Tap a card to hear it and see it light up; tap again (or wait a second) to pick. The game then plays a short "Mega Kick" movie: run-up, slow-motion wind-up, **BOOM**, and a flight through the world into a goal about 1,200 ft away. Tap after 2 seconds to skip it. Then a hand shows when to tap: **"Your turn!"**
- **Kick (Easy, default):** an arrow swings up and down. Tap anywhere and the kicker runs up and kicks at that angle. A hidden helper nudges every kick toward a good angle.
- **Kick (Pro):** tap once to lock the angle, tap again to lock the power. It's offered once with a **Pro?** button after 15 kicks (never when Assist is Gentle), with a hand demo of the two taps, or you can set it in the grown-ups panel.
- **Super Boots:** 3 per kick (boot icons, top left). Tap during flight for a boost puff. Boosts are biggest when Bouncy is low and slow, so saving one for just before he stops is the smart play.
- **Things in the world:** trampoline (boing), balloon bunch (pop), zoom pad, slide (a friendly long-neck dino or a rainbow slide), wind cloud, and the rare **golden star** (big boost plus a Super Boot back).
- **Soft stops:** goal net (**GOAL!** +20% distance), mud puddle (pink pudding in Girl mode) and hay bale (giant pillow in Girl mode). When Bouncy is rolling to a halt, one often pops up right where he will stop, so most kicks end somewhere silly.
- **Party:** the distance counts up, then a tier: Nice! → Great! (300 ft) → Super! (700) → AMAZING! (1,200) → LEGENDARY! (2,400). The distance is spoken. Then one big **Again?** button (spoken for the first 10 kicks). Nothing starts by itself.
- **No-fail:** no lives, no timers, no game over. Every kick goes at least 150 ft, and there are never 3 short kicks in a row. A hidden helper adds bouncers after short kicks and soft stops after very long ones, always drifting back to neutral. A run is capped at 6,000 ft, ending in a giant goal on the Moon or at the Star Castle.

### World zones (every 1,000 ft)
| | Boy mode | Girl mode |
|---|---|---|
| 0 | Soccer Field | Soccer Field |
| 1,000 | Dino Valley | Flower Meadow |
| 2,000 | Volcano Hills | Cupcake Hills |
| 3,000 | Rocket Sky | Rainbow Sky |
| 4,000+ | Moon (rocket launch base) | Star Castle |

Both modes play exactly the same. The kicker, world art, bouncer skins, colors and voice lines change. Any kid can play either mode, and unlocks are shared. Switch modes with the round boy/girl button on the title screen.

### Rewards
- **Sticker book (24):** first kick, first goal, 25 goals, gold stars, 1,000 / 2,000 / 3,000 / 4,000 ft, 25 and 100 balloon pops, a last-second boost, 30 boings, 10 slide rides, 5 splats, 5 flumps, plus reaching each world zone in each mode. Tap a sticker to hear its name.
- **Balls** unlock with total feet kicked (1.5k, 5k, 12k, 25k, 45k, 75k, 110k, 150k, 200k): Fire Stripes, Rainbow, Star, Planet, Glitter Gold, Dino Egg, Cupcake, Moon, Comet. The party screen shows a bar filling toward the next ball.
- **Boots** (colors) unlock at 4, 8, 12, 16 and 20 stickers.
- A **Best** flag stands on the field at the kid's record. Flying past it sets off fireworks and a "NEW BEST!" banner.

### Help
- First flight: when Bouncy slows down, the boots pulse and a hand shows "Tap! Boost!" This repeats until the kid has boosted twice.
- Idle 5 s at the kick: the arrow pulses. Idle 10 s: the voice says "Tap to kick!"
- The **?** button replays the right hint at any time.

## Install (iPhone / iPad)
1. Open the game link in **Safari**.
2. Tap **Share** → **Add to Home Screen**.
3. Launch it once while online. After that it works offline.

## Grown-ups panel
**Press and hold the gear (top right of the title screen) for 2 seconds.**
- Sound effects, music, voice on/off
- Kick style: Easy / Pro
- Assist: Gentle / Normal / Off (how much the hidden helper nudges the kick)
- Kid's name: the announcer cheers it ("Super kick, Leo!")
- Kicker skin tone: Auto or one of 5 tones (works in both modes)
- Hide boy/girl switch
- Last-kick reminder: off, or after 5 / 10 / 15 kicks. The last kick is announced, then a calm "All done!" screen appears. It stays locked, even after Home or a reload, until you hold the gear again or 30 minutes pass.
- Reset progress: hold 2 s, then hold again to confirm. Settings and the chosen mode are kept.

No ads, purchases, links, accounts or data collection. Everything (art, sound, music, voice) is made in code on the device. Progress is saved only on this device.

## Tips
- The **iPhone silent switch** can mute game sounds. Flip it if there is no sound.
- **Guided Access** keeps your kid in the game: Settings → Accessibility → Guided Access → On, then triple-click the side button inside the game.

## For developers / QA
`window.MK` exposes `G`, `S` and `sim(opts)`, plus test helpers: `tap()`, `state()`, `skipIntro()`, `play()`, `again()`, `home()`, `pickMode(m)`, `kick(angle, power, seed)`, `boost()`, `tick(seconds)`, `setSave(obj)`, `resetSave()`, `fx()`, `warp(x, y)`. `sim()` runs the same physics and generation code as live play. With `{commit: true}` it updates the save exactly like a real kick. Save key: `mega-kick.save.v1`. Service worker cache prefix: `mk-` (bump `VERSION` in `sw.js` on every change). `?icon=1` renders the home-screen icon art.

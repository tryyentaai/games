# Wildlight Jr.

A no-reading kids' version of **Wildlight** (the grown-up pocket RPG lives in `parents/wildlight/` and is untouched). It's built for ages 5–6, and a child who can't read can play it alone: every instruction is spoken and every button is a picture.

Voltkit, the little sky-blue fox from Wildlight, is your buddy. Together you walk through five places and make friends with 22 Wildlight creatures.

## How it plays

1. **Title.** Tap the big green ▶.
2. **Map.** Tap a picture to go there. A locked place shows a lock and a row of dots, one per friend still needed.
   Sunny Meadow (open) → Glow Woods (3 friends) → Bubble Beach (6) → Sky Mountain (10) → Rainbow Cave (15)
3. **Walk.** Tap the wiggly grass, bushes, sand, rocks or crystals and Voltkit hops over. A creature pops out, or sometimes a shiny star. Find 3 friends to finish the walk.
4. **Make a friend.** Fill 3 hearts with one of three mini-games:
   - **Peekaboo:** tap the creature when it pops out of a bush.
   - **Snack time:** match the snack in its thought bubble. Later the bubble shows only a shadow.
   - **Glow ring:** tap when the shrinking ring turns gold.
   Then tap the glowing ball to make it a friend.
5. **Party.** Your 3 friends dance with Voltkit. After that you get a calm choice: ↻ again, or the map. Nothing starts on its own.
6. **Sticker book** (orange book on the map). Friends show in color with up to 5 stars (one per befriending). Golden friends get a gold card. Tap an unknown shadow and it shows a picture of where to find that creature.

Evolved creatures (Thornback, Blazebear, Torrentoad and others) only appear after you've befriended their smaller form. The legendary Auroryx waits in Rainbow Cave.

## No-fail design

- No lives, no game over, no timers on thinking tasks, no red X. A wrong tap gets a soft boop and the next try comes right away.
- **Never 3 misses in a row.** After 2 misses the game quietly helps: in Peekaboo the creature stays out and glows (and hops to whichever bush you tap), in Snack time only the right snack stays tappable, and the Glow ring stops on gold.
- **Hint ladder:** a hand demo on first play → at 5 s idle the next thing pulses → at 10 s a spoken nudge → at 20 s a demo move. The **?** button jumps up the ladder.
- **Silent adaptive difficulty:** two quick perfect rounds step it up (shorter peeks, 4 snacks, silhouettes, a faster ring). Two rounds with 3 or more misses step it down.
- About 1 in 12 creatures is **golden** (after your first 3 friends).

## Grown-ups

**Press and hold the gear for 2 seconds** (on the title or map screen).
Settings: sound effects, music, voice, help level (More / Auto / Less), the child's name (shown on the title and party screens), a rest reminder after 3 or 5 walks (Voltkit gets sleepy), and hold-to-erase progress. Progress saves on the device and never resets on its own.

## Install (iPhone / iPad)

Open https://tryyentaai.github.io/games/wildlight-jr/ in Safari → Share → **Add to Home Screen**. Launch it once while online so it caches for offline play.

**Tip:** Settings → Accessibility → **Guided Access** keeps your child inside the game. Triple-click the side button to start it.

## How it was made

Made on Ryan's Mac with no cloud art or voice services:
- **Art:** FLUX.2 Klein 4B (mflux, local). 22 creatures plus Voltkit, each picked from 2 seeds, plus 5 painted backgrounds. Backgrounds were cut out and converted to WebP.
- **Voice:** Kokoro-82M (`af_heart` voice, local via mlx-audio). 68 pre-recorded lines, every one checked with local Whisper. They're used instead of the browser's robotic speech voice.
- Sound effects and music are synthesized live with Web Audio. No ads, purchases, accounts, links or data collection.

Debug handle: `window.WJ` (`G` state, `S` save, `api` test hooks). Save key: `wildlight-jr.save.v1`.

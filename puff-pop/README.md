# Puff Pop

A gentle bubble-shooter for kids 5-9. Aim, let go, and pop groups of three or more fluffy Puffs. Clear the board to free them all and earn a sticker. Every Puff, sticker and sound is original and drawn or synthesized in code.

## How it plays
- **Aim:** touch the board and drag; a dotted line and a see-through "ghost" Puff show where it will land. Let go to shoot. A quick tap shoots toward the tap.
- **Pop:** three or more of the same color pop. Anything left hanging falls for a bonus.
- **Swap:** tap the small Puff on the right (or the ready Puff) to switch them.
- **Undo:** the curved arrow takes back the last shot (up to 3).
- Each Puff color has its own shape (cat ears, star antenna, bear ears, leaf, bunny ears, curly tuft), so colors are never the only clue.

## One new idea per level
1. Aim and pop
2. Bounce off the walls
3. Pop the top, watch them fall
4. Rainbow Puff (matches any color)
5. Rocks (cannot pop, only fall)
6. Swap
7. Sleepy cloud (the ceiling slowly drifts down after misses)

From level 8 the ideas mix, with new shapes and colors. Worlds change every 4 levels: Sky, Sunset, Candy, Night and Sea.

## Never stuck, never a game over
- No lives, no timers, no game over. If the Puffs ever reach the bottom, a big wind whooshes them away.
- Hidden help keeps success around 75-80%: the ready Puff favors colors that have a real shot, near-misses gently snap into place, and after two misses the third shot always finds a match.
- Difficulty adapts quietly: two quick wins add a little, two hard levels ease off. It is never announced.
- Help ladder: first-time hand demos for each new idea; after 5 s idle the best target glows; after 10 s or two misses a short spoken nudge and a hand demo; the **?** button steps up the help, and its third press shows a golden "magic line" where any tap shoots the right shot.

## Rewards
24 collectible stickers (Puffs in party hats, crowns, glasses and more) in the sticker **Book**, then golden Puffs. Streaks of 5 pops bring a Golden Puff that pops a whole color. Celebrations grow from Pop! to Nice!, Wow!, Super!, Mega! and WOW!! Rounds end with a party and a calm Again / Next choice. Nothing starts on its own.

## The voice
Every spoken line is a recording from a natural-sounding neural voice (35 short lines in `voice.mp3`, rendered offline with Kokoro, voice af_heart). The phone's robot voice is never used. Because lines are pre-recorded, the kid's name is shown rather than spoken. The voice speaks sparingly: new ideas, nudges and big moments only.

## Install on iPhone or iPad
Open the link in Safari, tap Share, then Add to Home Screen. Launch it once while online so it saves for offline play.

## Grown-ups panel
On the home screen, press and hold the gear for 2 seconds. Sound, music, voice, help level (Normal / Extra / Max, which also turns off the sleepy cloud), kid's name, an optional "time for a break" nudge after 3, 5 or 8 levels, and a hold-to-reset.

Tip: Settings → Accessibility → Guided Access keeps your child in the game.

## Privacy
No ads, purchases, links, accounts or data collection. Progress is saved only on this device.

## For testing
`window.PP` exposes `G`, `S` and `api`: `state()`, `fire(deg)`, `best()`, `step(sec)`, `press(id)`, `btns()`, `setLevel(n)`, `down/move/up(x,y)`, `aimXY(deg)`.

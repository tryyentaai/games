# Star Keys — spec

Age band 7-9 (designed so a 5-6 year old can still play Learn mode).
Core verb: tap the right piano key when a falling comet-note lands on it.

## Teaching goals
1. Key names C D E F G A B C and their place on a keyboard (decorative black keys teach "C sits left of the two black keys").
2. Each note has one color forever (C red, D orange, E yellow, F green, G teal, A blue, B purple, high C pink).
3. A mini staff strip shows the upcoming notes as colored note heads, with the current letter under it, linking reading to keys.
4. Rhythm (Play), playing by ear and from memory (Echo).
5. Optional real piano: Web MIDI in Chrome/Edge on a computer, or a computer keyboard (A S D F G H J K).

## Modes per song (one star each)
| Mode | What happens | No-fail design |
|---|---|---|
| Learn | Notes scroll and stop on the line until the right key is pressed | No timer. Wrong key = boop + key wobble |
| Play | Notes flow with a backing beat, kid taps on time | Wide late-biased window, rescue: after 2 misses the next note waits on the line. Max 2 misses in a row |
| Echo | Pip plays a short phrase (lights + sound), kid plays it back | Wrong twice = phrase replays. Third wrong = hand shows the next key. Never auto-solves |

Crown: Play mode with 85%+ notes.

## Core loop
Home → Go! (suggests next step) → round (30-90 s) → party screen (stars, sticker, unlocks) → calm choice: Again / Next / Home. Nothing auto-starts.

## Songs (one new idea each)
| # | Song | Keys | New idea |
|---|---|---|---|
| 1 | Hot Cross Buns | C-E | Tap on the line |
| 2 | Little Lamb | C-G | A jump to G |
| 3 | Ode to Joy | C-G | F, all five fingers, dotted rhythm |
| 4 | Jingle Bells | C-G | Fast repeated notes |
| 5 | The Saints | C-G | Long notes (hold for a bonus) |
| 6 | Twinkle Star | C-A | A, big jump C to G |
| 7 | London Bridge | C-A | Runs down the keys |
| 8 | Old MacDonald | C-A | Repeats plus jumps |
| 9 | Row Your Boat | C-high C | High C, triplets |

Song N+1 unlocks when song N has any star.

## Difficulty (silent, persistent)
- Play: every 6 notes is a chunk. Two chunks at 90%+ → tempo +6%, window -6%. Two chunks under 60% → tempo -10%, window +18%. Bounds tempo 0.6-1.2, window 0.85-1.8x. Starts at 0.85 tempo.
- Echo: two clean phrases → phrase length +1 (max 6). Two messy → -1 (min 2). Starts at 3.
- Grown-up assist level: More (window x1.4, tempo x0.9), Normal, Less (window x0.8, tempo x1.1).

## Hint ladder (whenever the game waits for the kid)
1. Idle 5 s: target key pulses (Echo: the Listen button pulses).
2. Idle 10 s or 2 wrong: spoken nudge ("Find E!" / "Your turn!").
3. 3 wrong: a hand points at the key.
? button jumps one rung (in Play it also makes the next note wait).
First run: the hand presses the first key itself, then "Your turn!" and points until the kid's first hit.

## Rewards
- Every hit: key press, lane flash, particles, Good/Great/Super pop.
- Streak milestones 5 Nice, 10 WOW, 16 SUPER STAR (star power: rainbow lanes, double points, 8 s), 30 LEGEND, rising chimes and screen shake.
- Golden comets (~1 in 12) for bonus points, counted forever.
- Rare shooting comet in the sky.
- Stickers: one per song on first star, shiny at 3 stars. Tapping a sticker plays the song's opening.

## Unlock table (total stars, max 27)
| Stars | Unlock |
|---|---|
| 2 | Music Box sound |
| 4 | Candy world |
| 7 | Bells sound |
| 10 | Ocean world |
| 14 | Kitty sound (meow piano) |
| 18 | Space sound |
| 22 | Forest world |
| 26 | Gold world |

## Grown-ups (hold gear 2 s)
Kid's name, sound, music, voice, help level, key labels (Letters / Do Re Mi / None), last-round reminder (off/3/5/8), connect real piano (MIDI).

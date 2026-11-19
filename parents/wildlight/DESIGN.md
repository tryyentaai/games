# WILDLIGHT — Amber Edition

An original 4-shade handheld monster-collecting RPG built for phones. It belongs to the same genre as the classic 1990s pocket RPGs, but every creature, name, map, line of text and note of music is original. **Never use names, designs, music or text from any existing franchise.**

Pitch: *"A Game Boy built in 2026."* It has authentic 160×144 4-shade pixel rendering inside a premium translucent amber handheld shell, with haptics, a swappable LCD palette, an installable PWA and offline play.

Signature mechanic: your starter **VOLTKIT** (a tiny electric fox kit) chose *you*. It walks behind you in the overworld. If you face it and press A, it reacts with emotes based on its **bond** level (`mon.bond`, 0–255, which rises with battles won, walking steps and healing). It never evolves; it grows with you. At bond ≥ 200 it sometimes shrugs off a status, and it sometimes endures a KO hit at 1 HP (10%).

## Region: Amberleaf

| id | Name | Notes |
|---|---|---|
| `home` | Player's house (one room) | Mom NPC heals you. A TV and a bed. Start point. |
| `hollowbrook` | Hollowbrook Town | Starting town: home, Prof. Wren's lab, a sign, flowers, a pond. North exit goes to Route 1. |
| `lab` | Wren Lab | Story: the Professor is about to hand over a starter when a wild VOLTKIT bursts in through the window and leaps into your arms. The rival KAI takes SPROUTLE. First rival battle happens here (party SPROUTLE Lv5 vs your VOLTKIT Lv5). |
| `route1` | Route 1 | Tall grass and ledges. Wild: nibblet, fluffin, fuzzbug (Lv2–5). 1 trainer. |
| `fernhaven` | Fernhaven City | Care Center, Mart, Warden Hall (ROCK). Rival battle 2 at the town entrance after Warden 1 (or before, your choice of placement). |
| `care` | Care Center interior (shared, parameterized by town) | Nurse heals; sets `lastHeal`. A PC to deposit/withdraw is optional. |
| `mart` | Mart interior (shared, parameterized stock) | Buy and sell. |
| `hall_basalt` | Warden Hall: **Warden Basalt** (ROCK) | 1 junior trainer. Party pebbit Lv10, bouldurr Lv12. Badge **STONE**. |
| `whisperwood` | Whisperwood (forest maze, darker) | Wild: fuzzbug, cocoonix, sparkfly, mossprite, wispurr (rare). 3 bug-catcher/hiker trainers. Hidden items. |
| `lumenbay` | Lumen Bay | A seaside town with a Care Center, a Mart and a Warden Hall (WATER). |
| `hall_coral` | Warden Hall: **Warden Coral** (WATER) | 2 trainers. Party shellop Lv16, puddlet Lv15, torrentoad Lv18. Badge **TIDE**. |
| `skyridge` | Skyridge Path (mountain route) | Wild: pebbit, hootlet, puddlet (water edge), cindercub (rare), shellop. 3 trainers. |
| `summit` | Skyridge Summit | Final rival battle (gnashrat Lv20, galewing Lv21, thornback Lv23). Ending cutscene, then credits. Afterwards the Aurora Cave opens. |
| `aurora` | Aurora Cave | Post-game. The legendary **AURORYX** Lv30 waits as a static encounter. |

Gate story progress with flags, e.g. `got_starter`, `beat_rival1`, `badge_stone`, `badge_tide`, `beat_rival_final`, `caught_auroryx`.

## Creature roster (ids are lowercase and fixed; all modules use these)

| # | id | NAME | Type(s) | Evolves |
|---|---|---|---|---|
| 1 | voltkit | VOLTKIT | ELECTRIC | — (starter, follows you) |
| 2 | sproutle | SPROUTLE | GRASS | → thornback @16 |
| 3 | thornback | THORNBACK | GRASS/ROCK | |
| 4 | cindercub | CINDERCUB | FIRE | → blazebear @18 |
| 5 | blazebear | BLAZEBEAR | FIRE | |
| 6 | puddlet | PUDDLET | WATER | → torrentoad @18 |
| 7 | torrentoad | TORRENTOAD | WATER | |
| 8 | pebbit | PEBBIT | ROCK | → bouldurr @20 |
| 9 | bouldurr | BOULDURR | ROCK | |
| 10 | fluffin | FLUFFIN | NORMAL/FLYING | → galewing @14 |
| 11 | galewing | GALEWING | NORMAL/FLYING | |
| 12 | nibblet | NIBBLET | NORMAL | → gnashrat @16 |
| 13 | gnashrat | GNASHRAT | NORMAL | |
| 14 | fuzzbug | FUZZBUG | BUG | → cocoonix @7 |
| 15 | cocoonix | COCOONIX | BUG | → lumimoth @10 |
| 16 | lumimoth | LUMIMOTH | BUG/FLYING | |
| 17 | sparkfly | SPARKFLY | BUG/ELECTRIC | |
| 18 | mossprite | MOSSPRITE | GRASS | |
| 19 | wispurr | WISPURR | GHOST | |
| 20 | hootlet | HOOTLET | PSYCHIC/FLYING | → hootrix @20 |
| 21 | hootrix | HOOTRIX | PSYCHIC/FLYING | |
| 22 | shellop | SHELLOP | WATER/ROCK | |
| 23 | auroryx | AURORYX | PSYCHIC/ELECTRIC | legendary |

Types: NORMAL FIRE WATER GRASS ELECTRIC BUG FLYING ROCK GHOST PSYCHIC.
Items (ids): `potion` (+20), `superpotion` (+50), `antidote`, `awaken`, `fullheal`, `revive`, `orb` (catch ×1), `greatorb` (×1.5), `repel` (optional).

## Module contract

`js/core.js` defines the shared `G` API (read it). Scripts load in this order:
`core.js, audio.js, sprites_world.js, sprites_mons.js, data.js, menus.js, battle.js, world.js, dex.js, title.js`, followed by an inline `G.boot(canvas)`.
No build step. Write plain ES2020 inside an IIFE and attach to `G`. Never redefine core functions; add new ones only on your own namespace.

| File | Owner | Exposes |
|---|---|---|
| core.js | lead | everything in it |
| audio.js | shell | `G.audio = {play(track), stop(), sfx(name), cry(monId), unlock()}`. Tracks: `title, town, route, forest, cave, battle, trainer, warden, victory, heal, evolve, caught, ending, lab`. Sfx: `blip, cursor, select, back, bump, door, hit, hitSuper, hitWeak, faint, levelup, heal, orbThrow, orbShake, orbCatch, run, save, item, ledge, encounter` |
| title.js, dex.js | shell | `G.Title.start()` handles the title screen, the new game intro (professor speech plus name entry for player and rival), Continue and Options (palette, text speed, sound). It then calls `G.World.start({newGame})`. `G.Dex.open()` is the dex list and entry screen. |
| index.html, sw.js, manifest, icons | shell | Device shell. It calls `G.input.setVirtual`, sets `G.onHaptic`/`G.onPalette`, and boots. |
| data.js | battle | `G.DATA.mons[id] = {name, types:[..], base:{hp,atk,def,spd,spc}, learn:[[lvl,moveId],...], evo:{lvl,into}|null, catchRate, xpYield, dex:{kind:'FOX', ht, wt, text}}`. `G.DATA.moves[id] = {name, type, power, acc, pp, cat:'phys'|'spec'|'status', effect?}`. `G.DATA.items[id] = {name, price, desc, use}`. `G.DATA.typeChart`. `G.makeMon(id, lvl) → mon`, `G.recalc(mon)`, `G.healParty()`. |
| sprites_mons.js | battle | `G.SPR.mons[id] = {front: rows(32×32), back: rows(32×32), icon: rows(16×16)}` |
| battle.js | battle | `G.Battle.start({kind:'wild'|'trainer', enemy:[[id,lvl],...], trainer?:{name, cls, sprite?, prize, intro?, loseText}, canRun, onEnd(result)})`. The result is `'win'|'lose'|'run'|'caught'`. Battle handles XP, level-ups, move learning, evolution after battle, catching (to party, or box if full), money, `G.dexSee/dexCatch`, and music. On `'lose'` the caller (world) handles blackout. |
| menus.js | battle | `G.Menus.party({mode:'view'|'battle'|'item', onPick(i)})`, `G.Menus.bag({mode:'field'|'battle', onUse})`, `G.Menus.summary(mon)`. |
| world.js | world | `G.World.start({newGame})` covers maps, tiles, the overworld, NPCs, signs, warps, ledges, tall grass encounters, the follower VOLTKIT, the start menu (DEX/PARTY/BAG/{PLAYER}/SAVE/OPTIONS/EXIT), trainers' line-of-sight, story cutscenes, the Care Center, the Mart and the ending. `G.World.openOptions` may call `G.Title.options()`. |
| sprites_world.js | world | `G.SPR.tiles`, `G.SPR.chars` (player, rival, prof, mom, nurse, clerk, kid, lass, hiker, bugkid, sailor, warden_basalt, warden_coral, voltkit_follow) in 16×16, with 4 directions × 2 walk frames where relevant. |

### Mon instance shape (owned by data.js; everyone reads it)
```js
{ id:'voltkit', nick:null, lvl:5, xp:125, hp:20, maxhp:20, stats:{atk,def,spd,spc},
  moves:[{id:'spark', pp:30}], status:null /* 'PSN'|'BRN'|'PAR'|'SLP'|'FRZ' */, bond:70, dv:{...} }
```
Display name: `mon.nick || G.DATA.mons[mon.id].name`.

### Screen conventions
Screen 160×144. The textbox is at y=96 with h=48 and holds 2 lines of 18 chars (use `G.say`). Use `G.menu` for menus. Font cells are 8×8. Overworld tiles are 16×16, giving 10×9 visible with the player centred at (64,64)-ish. Color 0 is the lightest and 3 the darkest. Draw everything in palette indices only, so palette swapping works.

### Saving (autosave)
Progress saves on its own; the SAVE menu item still works but is never required.
- **When:** the world writes at *safe points* only (overworld on top, no script, warp or battle running): when control returns after a battle, cutscene, menu, shop, heal or warp; right before any script starts (so a story beat never saves half-done); every ~2 s while exploring if anything changed; and on `visibilitychange` (hidden), `pagehide`, `freeze` and `beforeunload`. Mid-battle or mid-cutscene the last safe snapshot on disk is kept. `playTime` alone never triggers a write.
- **API (core.js):** `G.autosave(force)` writes if progress changed (or always with `force`); `G.saveGame()`, `G.loadGame()`, `G.hasSave()` keep their meaning. `G.World.safe()` says whether now is a safe point. Modules should not call `localStorage` for game state directly.
- **Format 2:** `wildlight_save` holds `{fmt:2, at, sum, data}` where `data` is the JSON state and `sum` its FNV-1a checksum. Each write is read back; the previous good save moves to `wildlight_save_bak`. A save with a bad checksum or shape is ignored and the backup is used. Format 1 (`wildlight_save_v1`, a bare state) is loaded and migrated on the next write.
- **Safety:** every storage call is guarded, so private mode or a full disk never crashes the game (saving just returns false). Starting a NEW GAME over a save moves the old journey to `wildlight_save_archive`; `G.restoreArchive()` brings it back.
- **Test:** `node dev/sim_autosave.js`. Bump `VERSION` in `sw.js` whenever a cached file changes.

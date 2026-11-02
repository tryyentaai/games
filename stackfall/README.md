# Stackfall

A fast, modern falling-block puzzle. Fit the pieces, fill rows, clear them, survive as the speed climbs. Original name, art, colors and sounds, all drawn or synthesized in code.

## Rules engine
- 10×20 board with a hidden spawn buffer, 7-piece bag randomizer, 5-piece next queue, hold (once per piece)
- Super Rotation System with full wall-kick tables (I piece has its own)
- Ghost piece, 0.5 s lock delay with up to 15 move/rotate resets
- Gravity curve speeds up every 10 lines (levels 1-20), start at level 1, 5, 10 or 15
- Scoring: single/double/triple/quad, T-spins and T-spin minis (3-corner rule), back-to-back ×1.5, combos, perfect-clear bonus, soft and hard drop points
- Top 5 scores saved on the device

## Controls
**Touch:** tap the board to rotate, drag sideways to move, drag down to soft drop, flick down to hard drop, flick up to hold. On-screen buttons (left/right, soft drop, rotate both ways, hold, drop) are on by default on phones and can be turned off in Settings. Landscape splits the buttons to either side.

**Keyboard:** ← → move, ↓ soft drop, Space hard drop, ↑ / X rotate right, Z / Ctrl rotate left, C / Shift hold, Esc / P pause, Enter to start.

## Install on iPhone or iPad
Open the link in Safari, tap Share, then Add to Home Screen. Launch it once while online so it saves for offline play.

## Privacy
No ads, accounts, tracking or network calls beyond the font. Everything stays on the device.

## For testing
`window.SF` exposes `G`, `press(a)`, `release(a)`, `start()`, `step(sec, n)`, `setBoard(rows)`, `setCur(t, r, x, y)`, `setQueue(q)`.

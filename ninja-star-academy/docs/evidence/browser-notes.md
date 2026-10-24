# Browser checks — 2026-10-24

Production app opened in cloud Chrome: https://tryyentaai.github.io/games/ninja-star-academy/#missions .

- Star Throw completed with 12 target hits. Celebration awarded 12 stars and the first sticker.
- Lantern Pop completed with 12 lanterns. Pointer drag through a lantern changed the score from 7 to 8; the action button also worked. Pause/resume retained score.
- Two completed rounds produced 24 stars. Ocean scarf unlocked, was selected, and remained selected with 24 stars after a real page reload.
- Sky Run completed at 15 stars; the third-round celebration awarded 13 stars and unlocked Berry at 37 total stars. No failure/lives screen.
- Home and target/lantern/celebration screens visually inspected at the desktop cloud viewport.
- Local phone-layout fixture inspected in 375×812, 393×852, and 430×932 iframes. Actual content widths were 360, 378, and 415 after desktop scrollbars; no horizontal overflow was present in any frame. These are layout checks, not iPhone hardware emulation.
- Updated local runner completed at the 40-second active-time deadline under low-frame-rate browser conditions. The zero-collection result still awarded 8 stars as intended. Phone-sized celebration controls fit on screen.
- Sound and reduced-motion switches changed their accessible checked state in the phone layout. The settings target sizes were then enlarged to at least 44px.
- Production page displayed Ready for offline adventures after worker cache installation. Worker offline fallback, safe activation, cache scope, sibling isolation, and every precache file are checked by executable Node tests. Network-disabled browser launch, standalone iOS installation, physical iPhone, screen-reader, and frame-time profiling were not performed.
- Browser logs inspected: only extension-owned metadata errors were observed; no application JavaScript error was found in the checked interactions.

# Verification — 2026-10-24

## Passed

- `npm test`: progress validation, reward/unlock/collection behavior, swipe/tap geometry, cache asset existence, offline navigation fallback, fresh online navigation, safe update behavior, sibling-cache isolation, unrelated-request isolation, two-fps runner timing, and pause-time exclusion.
- `npm run check`: syntax checks for app, game, artwork, and worker.
- Production cloud Chrome: all three missions completed, target hits and lantern swipe operated, celebrations/rewards observed, scarf unlock/selection exercised, and 24 stars plus Ocean scarf retained after a real reload. The next completed run awarded 13 stars, produced 37 total stars, and unlocked Berry.
- Phone-layout fixtures: 375×812, 393×852, and 430×932 iframe viewports, with content widths reduced by desktop scrollbars; no horizontal overflow. Home and results inspected. The corrected runner completed at the active-time deadline in the typical phone layout. These are layout checks, not iPhone hardware emulation.
- Sound/reduced-motion settings switched their accessible checked state. Settings button/close/switch target heights enlarged to at least 44 pixels.
- Production worker reported offline cache readiness. Actual offline fallback/update logic is covered by Node tests.
- Independent read-only source/test/screenshot review found no definite gameplay blocker.

## Remaining verification limits

Physical iPhone/Safari/WebKit, native Home Screen installation, network-disabled browser launch, screen-reader use, larger-text/device-keyboard behavior, and on-device frame-time profiling were not performed. This is a playable browser-verified beta; it is not certified as an App Store-quality paid release.

Evidence: `docs/evidence/browser-notes.md`, `phone-layouts.jpg`, `tests.txt`, and `syntax.txt`. Tests use synthetic data. No personal or payment information is present in screenshots.

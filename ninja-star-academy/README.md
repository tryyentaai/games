# Ninja Star Academy

A touch-first ninja web app for children around five: Sky Run, Star Throw, and Lantern Pop. Stars unlock scarves and a twelve-sticker collection. No ads, purchases, game accounts, analytics, or collection of child information. Progress stays on the current browser and can be backed up/restored.

## Play and install

Open https://tryyentaai.github.io/games/ninja-star-academy/ in Safari. Choose Share → Add to Home Screen and enable Open as Web App if offered. Wait for “Ready for offline adventures” after the first visit. Clearing website data removes local progress; different devices/origins have independent saves.

The app is a browser-installed PWA, not a native App Store binary. Physical iPhone installation and an actual network-disabled iOS launch have not been tested. This remains a beta with those verification limits.

## Run and verify

Serve this directory from a static HTTP development server or HTTPS host. No build step or third-party runtime dependency is required. Canvas 2D, Pointer Events, Web Audio, and ES modules supply the game. The scoped service worker caches the app shell and assets and waits for a safe update point. Files resolve relative to the app directory, preserving sibling games.

With Node 22 or later, run `npm test` and `npm run check`. Tests cover progress validation, rewards/unlocks, swipe geometry, every offline cache asset, offline fallback, safe/scope-isolated updates, and runner timing at two frames per second with pause/resume.

## Browser verification — 2026-10-24

All three missions were completed in cloud Chrome. Target hits, lantern pointer swiping, rewards, scarf unlocking, pause/resume, and progress/selected-scarf retention after a real reload were exercised. Desktop home/play/results and three phone-width iframe layouts were visually inspected. Settings switches were operated. Offline cache readiness appeared in the production app; worker fallback/update behavior is also covered by Node tests.

These are browser and responsive-layout checks, not physical iPhone, WebKit, screen-reader, or device frame-time certification. See `docs/evidence/browser-notes.md` and `docs/verification.md` for exact scope.

## Controls

- Sky Run: tap to jump and tap again while airborne to double jump. Bumps give a gentle spring upward. Finish at fifteen stars or forty active seconds; pauses do not use that time.
- Star Throw: tap large wooden targets or use Throw. Twelve hits finish; no time pressure or miss penalty.
- Lantern Pop: swipe/tap lanterns or use Pop. Twelve lanterns finish; no lives to lose.

Settings offers mute, gentler play, calmer motion, and progress backup/restore. All interface/world/character artwork in this shipped version is original vector/code art. No third-party characters or external art assets are used.

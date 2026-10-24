# Moonshot Club

Phone-friendly 3D baseball batting practice: one-tap swings, assisted timing, varied home-run distances, cinematic ball flights, batter celebrations, fireworks, and saved progress.

## Play on your iPhone

Open https://tryyentaai.github.io/games/moonshot-club/ in Safari. Tap Share, then Add to Home Screen. No sign-in or purchase is needed. Progress stays in this browser on this device; clearing site data removes it.

The latest pacing automatically starts the next pitch after a short celebration. Regular hits alternate distances and four visual styles; every fifth hit is a Mega Swing.

## Source and local use

This folder contains the full playable source and local assets. There is no production build step or runtime CDN dependency. Serve the folder over HTTP, for example:

```sh
python3 -m http.server 8080
```

Then open http://localhost:8080. Use a modern WebGL2-capable browser.

## Checks

Node.js 20+ recommended. Install the development-only canvas dependency and run:

```sh
npm install
npm test
```

The tests cover scoring, persistence, pacing, derby completion, camera paths, bat contact, celebrations, and bounded effects. Automated checks do not replace physical iPhone touch, audio, and GPU testing.

## Included licenses

- Three.js: MIT; see THREE-LICENSE.txt.
- Barlow Condensed fonts: SIL Open Font License; see fonts/OFL.txt.
- Crowd recording: CC0; see audio/CREDITS.txt.

## Development helpers

`diagnostics/render-scene.mjs` produces a CPU geometry framing diagnostic; it is not a browser screenshot or a validation of GPU lighting.

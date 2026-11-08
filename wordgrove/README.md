# Wordgrove Spelling Camp

An iPhone-first spelling arcade for a first grader's own printed English worksheets. Open in Safari and choose Share → Add to Home Screen. Launch an included starter list or choose Scan my words. Confirm the recognized list, then choose one of eleven games. Each session has three short rounds. Stars, sound preference, and lists stay in the browser. My words includes JSON list backup and restore.

Run locally with a static HTTP server rooted at the wordgrove folder. The server needs to return ordinary files, including the gzipped English model. There is no production compile or cloud API. Run npm test with Node 22+. GitHub Pages hosts this folder under games/wordgrove and the Sites build serves the app as the origin root.

## Acceptance journeys

1. Read a printed list using the camera or gallery, correct a mistaken word, start a game, and hear or see clues from the new list.
2. Play a three-round session, retry a missed letter, and receive a star for each completed round. Word searches use straight lines, crosswords reuse shared letters, and trails use adjacent tiles.
3. Relaunch and find the same list and stars. Export spelling lists for a new device, or play the starter list immediately. Offline assets become available once the first installation cache finishes.

Photos are processed on-device and discarded. No sign-in, analytics, advertising, purchases or external font requests. The current scanner supports up to 36 English alphabetic words, each up to 18 letters. Typed entry handles unreadable print. This package is a web app.

## GitHub Pages

Publish this complete folder at `wordgrove/` in the `tryyentaai/games` repository. The expected game URL is https://tryyentaai.github.io/games/wordgrove/ . All application paths are relative so the game works under this subdirectory. Scanner engine, English model, artwork, and service worker are bundled. The GitHub Actions Pages deployment reports hosting status. Physical iPhone verification is pending.

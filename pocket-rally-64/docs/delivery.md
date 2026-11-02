# Verified delivery

Game source commit: 814086a24c784e4ec522aa1904762a3063f1a75a
Repository: https://github.com/tryyentaai/games/tree/main/pocket-rally-64
Live game: https://tryyentaai.github.io/games/pocket-rally-64/dist/
GitHub Pages deployment: https://github.com/tryyentaai/games/actions/runs/41370273354 — completed successfully.

Remote main was verified using git ls-remote and fetched; git diff against the local tested source was empty. The existing Puff Pop and other sibling apps were preserved. The live games menu contains Pocket Rally. Browser followed the menu entry through its redirect, rendered the garage, started a race, and observed the timer advancing to 4.23 seconds with moving scenery, controls, and HUD. Screenshot: live-race.jpg.

The cloud browser uses the software fallback because WebGL is unavailable. This is a deployment/startup check, not a complete live race or physical iPhone certification. 15 automated tests passed. Source preservation is complete; physical-device and other noted release gates remain open.

Install: open the live URL in Safari, choose Share → Add to Home Screen → Open as Web App if offered → Add. A PWA, not a signed App Store binary.

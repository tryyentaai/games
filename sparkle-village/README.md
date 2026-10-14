# Sparkle Village

An original illustrated, browser-local learning game for young explorers. Visit Pip's pet cottage, Clover's shop, and Luna's story garden. Complete six-step adventures to earn village decorations and companion friends.

## Play

Open `https://tryyentaai.github.io/games/sparkle-village/` in Safari. Use Share → Add to Home Screen to install. Visit once online and let the service worker finish downloading before going offline. No accounts, analytics, remote fonts, ads or purchases.

Grown-up settings (gear, then 11 + 7) select math and reading separately: kindergarten, first grade, or second grade. This arithmetic guard is not a security boundary. Math-only, reading-only, and mixed modes are available. Narration, gentle sounds, and background chimes have separate controls. Speech comes from device voices and may require connectivity; the core game does not.

Targets are representative practice, not an accredited or comprehensive curriculum. Every new skill opens with a worked example. The same skill revisits with varied problems. Reading tasks are authored banks; math tasks are generated. Narration of the target question, a hint, or an initial error excludes that response from independent success. Listening is counted separately. Adaptive mode stretches math ranges after repeated independent success in distinct completed adventures, within the chosen grade. Reading remains in its chosen bank. There is no grade auto-promotion.

Saving uses localStorage. Saves are specific to the browser, origin, and device. Export a JSON backup in grown-up settings before clearing website data or changing devices; import replaces the current save after confirmation. Six profiles have independent settings and worlds. You can close mid-adventure and resume.

The game uses authored SVG art, responsive CSS, native dialogs, Web Audio, Speech Synthesis where available, and a narrowly scoped offline cache. There are no network services or dependencies. `node test.mjs` runs the content and state checks. `node test-ui.mjs` runs the simulated DOM interaction checks. These do not substitute for testing on a physical iPhone.

Build prompt: [BUILD_PROMPT.md](./BUILD_PROMPT.md).

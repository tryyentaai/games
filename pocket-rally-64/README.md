# Pocket Rally 64

Original 3D kart racer, optimized for touch and built as an installable PWA. Open the deployed link in Safari, Share → Add to Home Screen → enable Open as Web App if offered → Add. Landscape gives the widest course view; portrait is also supported.

## Run and verify

Requires Node 22+ and npm. Run `npm ci`, `npm run build`, `npm test`. Serve `dist/` through a static HTTPS host (localhost is sufficient for development). Build emits the pinned Three.js bundle; application source is the readable modules in `dist/`. Keep all relative asset paths when serving a subdirectory. No secrets or backend configuration required.

A Sites manifest is maintained by the deployment workflow. Source is mirrored to the user's GitHub in an isolated `pocket-rally-64/` directory. Do not replace sibling game folders or root hosting configuration.

See `docs/product-contract.md`, `docs/implementation.md`, and `docs/release-evidence.json` for scope, provenance, validation and release limitations. This is a PWA, not an App Store binary. Not affiliated with Nintendo.

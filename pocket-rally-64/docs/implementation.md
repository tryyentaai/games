# Implementation decisions — 2026-11-01

Three.js 0.187.0 (MIT, retained license) + browser-native UI and Web Audio. Installed exact version from npm and committed lockfile. Current official Three.js docs establish WebGL 2 requirement and installation approach. esbuild is a dev-only bundled production dependency builder. Renderer runtime is vendored for offline play.

Alternatives: Godot exported to web/native would provide editor-authored scenes and physics, but introduces heavier export/toolchain requirements and does not solve unavailable Apple signing. A 2D engine such as Phaser suits sprite games but does not directly match this reference's spatial camera and track requirements. Three.js chosen for controllable real 3D geometry, light deployment, custom arcade physics and zero paid services. No claim that it is universally best.

Reference research:
- Nintendo Mario Kart 64 official manual: https://www.nintendo.com/eu/media/downloads/games_8/emanuals/nintendo_8/Manual_Nintendo64_MarioKart64_EN.pdf — item acquisition, lap racing and race structure.
- Nintendo Mario Kart 8 Deluxe: https://mariokart8.nintendo.com/ — readable colorful environments and character separation as visual benchmark, not assets.
- Apple Sonic Racing feature: https://apps.apple.com/us/story/id1740849417 — mobile kart-racing interaction benchmark.
- https://threejs.org/docs/pages/WebGLRenderer.html and https://threejs.org/manual/pages/installation.html — rendering and installation requirements.

All characters, course control points, mesh assembly, UI, icon and synthesised music are original code-authored assets. No copied game models/audio, external fonts, analytics or purchased assets. System rounded typography. Warm cream UI, dark teal ink, orange action, green/blue/pink character colors. Primary gameplay touch controls 61–76 CSS pixels; menus focus-visible and modal focus trap. Reduced motion disables extra boost particles/FOV movement.

Signature interactions: drift charge -> release turbo with meter/color/audio/FOV feedback; item gem -> pickup burst -> distinct use effect with readable HUD.

The cloud browser reports WebGL disabled at the renderer level. A CPU triangle renderer provides a same-geometry fallback; it is lower fidelity (flat shading and simplified texture handling) and its performance is not a surrogate for iPhone WebGL. No alternate browser runtime was installed to bypass environment policy.

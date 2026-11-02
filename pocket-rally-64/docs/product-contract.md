# Pocket Rally 64

Audience: children roughly 5–10 and parents. Original console-inspired kart racing, interpreted from Mario Kart 64's chase camera, steering/drift loop, item surprises, lap races and immediate replay. This is not a Nintendo product and uses no Nintendo assets.

Deliverable: installable PWA; 3 original courses, 4 selectable original character silhouettes, 6 competitors, 3-lap quick races, drift tiers, 4 items, boost strips, mini-map, 3 difficulty settings, optional steering assist, audio, pause/resume, local best times and settings. No ads, accounts, trackers or purchases. No multiplayer, native binary, store submission, licensed Nintendo characters, or commercial-game content parity.

Thirty-second loop: launch/choose -> count in -> steer through a corner -> charge/release drift -> gather a gem -> use an item -> advance lap -> complete/results/retry.

Acceptance journeys:
1. Launch, select racer/course, complete 3 laps, use steering/drift/item, see ordered results, retry.
2. Pause/resume, keyboard or touch cancellation, background interruption, no simulation jump, return to garage.
3. Change settings, record a result, reload, verify persistence; offline load after first successful cache.

Storage: namespaced versioned localStorage, validated values, failure toast. Records separate difficulty and assist modes. Browser storage may be evicted. Offline: all game assets cached after a successful initial load; first-ever offline visit unsupported. Worker updates wait for existing windows to close. No cloud synchronization.

Handling: guided arcade spline, with continuous forward progress and lateral steering. This is forgiving arcade handling, not a freely simulated vehicle. Corners exert lateral pressure; off-road slows the kart. Default steering assist aids boundary recovery, not perfect play. AI uses the same distance model with difficulty factors, smooth lateral choices and items; no teleportation. Finish ordering uses actual crossing times; unfinished opponents are shown with labeled estimated times.

Performance targets (not yet physical-device measurements): 60 fps preferred, 30 fps minimum; max DPR 1.6, <=100 particles, bounded projectile/hazard counts, static scenery merged by material. Initial JavaScript approximately 800 KB uncompressed, local dependencies. Software fallback has lower rendering fidelity and is primarily for unsupported GPUs.

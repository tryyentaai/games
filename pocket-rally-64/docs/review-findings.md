# Independent review and remediation

A separate review read raw source and the contract and ran the existing tests without a desired verdict.

Confirmed and fixed:
- Unique per-kart geometry/material cleanup during selection/retry; shared cached resources retained. Regression test observes disposal.
- Particle bursts clamped to remaining capacity, and paused dt=0 no longer spawns boost particles. Hard cap regression test added.
- Expired projectile cannot hit after its lifetime ends. Regression test added.
- Offline cache version generated from a SHA-256 digest of essential build assets, ensuring asset updates change worker bytes.

Additional owner corrections: positive lateral input now follows the camera's screen-right basis, with ribbon winding corrected accordingly; test checks basis orientation. Modal backgrounds made inert with a focus loop. Compact menu touch targets raised to 44px or more.

The review did not constitute visual, audio, physical-device, or deployment testing. No independent claim of commercial parity or release readiness was made.

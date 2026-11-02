# Browser verification — 2026-11-01

Environment: managed cloud Chrome, CPU renderer because WebGL creation reports GL_VENDOR=Disabled / GL_RENDERER=Disabled. Viewport fixtures use a real iframe at 375x667, 393x852, 430x932, and 852x393 CSS pixels, not physical iPhone emulation. A desktop viewport was also inspected.

Observed through UI:
- Launch shows garage, driver portraits, course selection and start control.
- 393 portrait: started race; countdown transitions to moving course with position/lap/time and controls. Used native keyboard steering and held drift with steering, then paused. Drift charge appeared in the captured frame.
- Pause held time at 8.93s across intervening work. Resume and immediate repause advanced only to 9.05s, without a hidden-tab jump.
- Returned to garage, changed sound to off and difficulty to Normal. Reload and Settings showed both persisted.
- Course selection changed from Sunshine Cove to Canyon Run to Starlight Summit and rendered distinct worlds. A night-course screenshot exposed low-contrast header branding, fixed with a cream wordmark backing.
- Portrait menus fit at 375x667 and 393x852, and landscape at 852x393. Touch-target enlargement and inert modal backgrounds were applied during review.

Limits:
- The constrained CPU-rendered preview is slow. A sampled diagnostic reported mean frame interval ~193ms and p95 ~1017ms in cloud Chrome; frame sampling includes environment scheduling/throttling. This is not iPhone performance and misses the 30fps target for this environment.
- A complete race was verified in the simulation tests on every course, not through an uninterrupted browser journey. A full browser race, audible sound evaluation, actual two-finger touch, physical iPhone installation, WebKit, offline network-disconnected launch and service-worker upgrade were not verified.
- CPU fallback uses reduced geometry, flat shading and simplified texture handling. WebGL production renderer uses full scene geometry, textures, lighting and shadows but could not be visually exercised here.
- No App Store binary/signing/submission exists. A PWA release is not App Store certification or a substantiated price/value claim.

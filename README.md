# Zaira's Universe — Motion Lab alpha

Camera-controlled browser games. This first modernization stage keeps the original Canvas runtime while extracting testable controls, a perspective cockpit and an original musical score.

## Try the change

Use the Vercel preview belonging to the pull request for branch `codex/motion-lab-2026-10-17`. Camera access requires HTTPS or localhost and a direct browser tab. Production remains on the original baseline until the change is reviewed and real-device checks are recorded.

- 13 games plus a parent diagnostic mode.
- Both dinosaur games are removed. Balloon DUO and shared Glass remain.
- The single-player driving game uses a first-person perspective cockpit and a calibrated line between the two wrists. No paper, marker or physical wheel is required by the implementation.
- Age adjusts target size and baby protection; movement tempo and cognitive level are independently selectable.
- Original 32-bar low-volume music replaces the short repeating note loop.

## Verification

No build step or API key is required. Serve the repository with a static HTTP server.

```sh
node --test tests/regressions.test.cjs
npm install --no-save --ignore-scripts --package-lock=false playwright@1.56.1
npx playwright install chromium
node tests/browser.cjs
```

The browser script starts its own local HTTP server. It captures desktop/mobile menu and cockpit screenshots. Its camera stream and pose detector are synthetic; this does **not** validate the real MoveNet model or physical movement accuracy. The regression suite covers lifecycle cancellation, late streams/inference, gesture calibration, independent difficulty, answer geometry and all game constructors/renderers.

The GitHub Actions workflow runs these checks and stores screenshots. The application retains pinned TensorFlow.js 4.17.0 and pose-detection 2.1.3. The menu uses pinned GSAP 3.12.5 with a native animation fallback. CDN assets and fonts require network access; offline support is not implemented.

## Parent setup

1. Use a stable front-facing camera and enough light to see both wrists.
2. Select an age profile, then adjust tempo and task difficulty separately.
3. For driving, hold both hands comfortably in front of the torso, horizontally like a wheel. Hold still for roughly one second; then rotate the wrist line. The steering sensitivity can be changed in the menu. “Vyrovnať volant” recalibrates.
4. The driving game pauses when both wrists cannot be tracked. Other games pause their simulation if the pose expires; time-mode countdown pauses too.
5. All games release camera tracks on finish, cancel, error or hidden tab. Time mode lasts 60 active seconds. Lives mode is bounded to 180 active seconds; any round ends after five wall-clock minutes.

Do a short supervised device test before giving the alpha to a child. This is a gameplay prototype, not a validated developmental assessment.

## Baseline and rollback

Canonical repository: https://github.com/aurelbacho-cyber/zairas-universe

Original reference commit: `88a2bf6cb56a73e696d0802283a8f4007fba9156` (2026-08-22).
Original `index.html` blob: `6cec71e311353d185ef756ce90db5a4102ae2ef9`.
The original commit is kept intact; this branch descends directly from it and excludes the unrelated Claude/lm2627 branch.

Before production merge, record the Vercel deployment URL and checks. To roll back a merged change, revert its merge commit through a new PR or restore the known original deployment in Vercel. Do not force-reset shared history.

See [modernization plan](docs/modernization.md) for source feedback, remaining limits and follow-up estimates.

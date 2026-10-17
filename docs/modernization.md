# Modernization stage 1 — 17 October 2026

## Evidence and source ownership

- Main was re-read at commit 88a2bf6cb56a73e696d0802283a8f4007fba9156. It has not changed since 22 August.
- Read the complete 5-page file ZAIRAS_UNIVERSE_TESTOVACI_DOTAZNIK(1).docx (Michal, age 11). Test date entered: 15 August 2026; this predates the canonical commit and is not tied to a source SHA.
- Michal marked speed and overall difficulty “appropriate”, object count “too few”, controls “mostly OK”, and response “slightly delayed”. His priorities were crouching, music and harder age-appropriate mathematics. He requested balloon burst animation and preferred Auto. He rated the experience 8/10 and repeat play “maybe”.
- Aurel separately reports insufficient pace/content for older children. That observation informs an adjustable tempo rather than silently rewriting Michal's answers.
- Read the previous full audit artifact, with particular attention to the P0 lifecycle and P1 gameplay findings. No claim of a physical camera test or live production inspection is made.
- “Relaxed Scene” has no exact supplied URL or file. This change ships an original procedural score, not an unidentified recording.

## Implemented

| Area | Change | Limits |
| --- | --- | --- |
| Lifecycle | Session epoch, owned timers, cancellable countdown, late-stream cleanup, shared inference lock, serialized model creation, immediate result screen | Real Safari/Android permission flows still need validation |
| Timing | Separate inference and rendering; fixed 60 Hz simulation for legacy games, seconds-based driving; expired poses pause gameplay | Slow-render catch-up is capped; under severe overload simulation intentionally slows rather than making a large jump |
| Camera | Every terminal path stops tracks and detaches srcObject; pagehide/hidden tab cleans up | Browser permission indicator timing belongs to the browser |
| Driving | Perspective first-person cockpit, road bends, dashboard and steering wheel, wrist calibration, dead zone, time-based smoothing, sensitivity, missing-hand pause | Canvas perspective rather than a true 3D engine; one driver; no claim that real hand accuracy is validated |
| Balloons | Visible initial objects, three independent density/tempo presets, geometry-aware spawning, burst particles/rings, retained duel | Density limits are starting values for playtesting, not validated age norms |
| Runner | Torso-relative baseline, hip/shoulder evidence, crouch priority, neutral on missing pose, calibration before obstacles progress | Genuine jumps and camera re-framing require physical testing; no intentional rapid flashing |
| Logic | Fixed colour-sort rule while items remain; non-overlapping answer circles; dwell-and-release answers; number sequence layout and one selection per confirmation | More formal round transitions, audio instructions and accessibility alternatives remain |
| Difficulty | Age for targets/baby protection; independent tempo and cognitive level; arithmetic +, subtraction, multiplication and exact division | No validated skill assessment or adaptive progression yet |
| Music | Original 32-bar layers at 88 BPM: harmony, bass, melodic variation and soft percussion; stops with session | Must still be listened to on speakers/phone; no external track was licensed or generated |
| Dinosaurs | Removed menu, metadata, classes and helpers for Hunt/Nest | No changes to unrelated repository branches |
| Menu | Familiar font, categories, emoji and skeleton retained; softer contrast, focus/keyboard support, expanded settings, reduced-motion handling, GSAP entry animation | This is a first visual pass; remaining games retain their original illustration style |

## Manual release checklist

Record device name, OS/browser version, session URL and observations.

1. Desktop Chrome: camera permission, one-player start/finish/restart, blocked camera, cancel loading and countdown.
2. Android Chrome: front-camera orientation, landscape and portrait, audio unlock, tracking freshness, hand reach, frame time.
3. iPhone/iPad Safari: the same checks plus playsinline video, background/resume, denied permission and audio state.
4. Wheel: straight, left/right tilt, neutral recalibration, translated hands, crossed/hidden wrists, returning after loss. Confirm left/right motion visually with the mirrored camera.
5. Runner: stand still, crouch, return, jump, raise arms, lose body and re-enter. Never ask the child to jump to compensate for a tracking defect.
6. Balloon: no long empty intervals at each tempo, no unavoidable piles, readable burst, DUO at both sides.
7. Maths: new question appears only once per deliberate hold; stationary hand cannot answer successive rounds; phone circles do not overlap.
8. Music: listen for clicks, clipping, annoying repetition, mute/restart/background and comfortable volume.
9. Physically test with both Zaira's ability level and an older tester; their appropriate task complexity may differ substantially.

## Remaining work and estimates

Engineering hours below are planning ranges, not timers, promises or a price quote. Do not add a paid AI service merely for game execution; current tracking runs in the browser.

| Stage | Scope | Estimated effort | Suggested AI role and reasoning |
| --- | --- | --- | --- |
| 1 — this branch | Lifecycle + wheel/cockpit + density + music + dinosaurs + first logic fixes | 8–16 h equivalent engineering/review, plus device checks | Codex: high for lifecycle/gestures and review; medium for UI edits |
| 2 | Real-device tuning, compare recorded keypoint traces, input latency/FPS metrics, fair 2P identity | 8–14 h | Codex high; an independent reviewer can use Claude Sonnet 5.5 if already available |
| 3 | Every mini-game gets clear rounds, increasing content challenges, explicit skill settings and optional parent-child cooperative goals | 16–28 h | Codex high for rules and medium for bounded implementations; review with a stronger reasoning model |
| 4 | Consistent art direction across games, original music audition/revision, spoken Slovak instruction, reduced-motion/low-reach variants | 12–22 h | Coding model medium; image generation for selected art only; Kling for an optional short intro, not realtime graphics |
| 5 | Incremental TypeScript/Vite migration, release identity, offline strategy, cross-browser checks | 10–18 h | Codex high for migration boundaries and medium for routine conversions |

Remaining stages total roughly 46–82 engineering hours plus supervised tests and iteration. Full true-3D car assets/renderer are separate scope, tentatively another 12–24 h after the steering works well on target hardware. Do not move this browser project to Unreal merely because the skill is installed.

Use the strongest available reasoning on calibration, concurrency and correctness. Routine colours, copy, settings controls and bounded art tasks do not need maximum reasoning. AI model availability should be checked in the user's actual picker; these are task-role recommendations, not universal benchmark rankings.

## Deliberately unresolved

- Two-player IDs are still assigned spatially in the original helper. Switching sides can still swap identity; this needs recorded traces and an explicit game rule.
- Some original games use all detected palms while a main object follows poses[0]. The cockpit explicitly forces one driver; other 2P scope needs a per-game pass.
- Some drawing feedback strings still describe penalties even when baby mode suppresses them centrally. Review all feedback and remove those inconsistencies before a child release.
- No parental gate, total multi-round session plan, offline cache or commercial release packaging.
- No actual model benchmark, real camera accuracy study, audio audition or child session was performed in this coding environment.

# Testing and release acceptance

Updated: 2026-10-17. Test evidence belongs to an exact revision and environment. Use [current state](../PROJECT_STATE.md) and the [backlog](backlog.md) together with this checklist.

## Evidence already available

| Target | Check | Result / limit |
| --- | --- | --- |
| Production `88a2bf6` | Raw Git blob versus production HTTP HTML | Byte-identical, 104,049 bytes; SHA-256 in the reconciliation report. Not a gameplay or full-dependency audit |
| Candidate `761003a` | Local `node --test tests/regressions.test.cjs` | 22 passed, 0 failed, Node v24.19.0, 2026-10-17. DOM/camera/model/canvas substitutes; an expected model-failure log appears in the error-path test |
| Candidate `761003a` | [Existing GitHub Actions run](https://github.com/aurelbacho-cyber/zairas-universe/actions/runs/39035534061) | Completed/success. Workflow runs Node regression plus Chromium smoke at 1280×800 and 390×844, and uploads screenshots |
| Candidate browser script | Source inspection of `tests/browser.cjs` | Actual DOM/Canvas with synthetic camera and stubbed pose model; exercises menu/cockpit, input loss and camera cleanup. The deployed-preview fetch is diagnostic and is not an authenticated gameplay assertion |
| Physical device / child / sound | No such test performed by this audit | Open acceptance items; neither green CI nor Ready closes them |

The 4 October report's isolated defect reproductions concern unchanged original main. They are historical diagnostics, not this audit's newly executed tests. Do not add together diagnostic count, Node test count and browser viewport count as if they were one independent quality score.

## Reproduce candidate automated checks

On a checkout of the exact candidate, with Node installed:

```sh
node --test tests/regressions.test.cjs
```

The candidate's browser workflow installs `playwright@1.56.1` and Chromium; follow its pinned workflow/README if repeating the browser test. This audit did not install or rerun that browser environment. Main has no test suite yet. Dependencies, lockfile strategy and future CI requirements belong to P1-06/P1-07.

## P0 acceptance with an adult

Record exact preview/deployment and source SHA before starting. Use the chosen candidate, then test:

1. Normal timed/lives finish, explicit exit and replay: tracks end, `srcObject` detaches, music stops; menu/results remain stable.
2. Permission denied, unavailable camera, failed model load after camera acquisition, metadata timeout and late stream resolution: a useful error and complete resource cleanup.
3. Cancel during camera wait, model wait and every countdown stage; rapid double start and 1P/2P changes during pending work: only the newest session can continue.
4. Stop while inference is pending, return to menu and start another game: old results cannot update new poses/game/screen or schedule a second old loop.
5. Background/hide, lock/unlock, page exit and orientation change: defined recovery, no hidden play or orphan camera/music; repeat the cycle.

Automated cases cover only part of this matrix. If a P0 case fails, record its reproducible steps and stop expansion of the candidate until resolved. Do not ask a child to compensate for a tracking fault.

## Device and input matrix

| Environment | Minimum focused cases |
| --- | --- |
| Android Chrome | Permission/restart; portrait/landscape; real wrist/palm alignment; crouch/jump; audio start/mute; background return |
| iPhone Safari | Same cases, plus inline video and audio activation after loading; blocked permission recovery |
| Lower-performance device | Steady-state and longer adult run; model/render/input age; no penalties caused by missing input or overload |
| Notebook / tablet | Reachable targets and viewport crop; clear instructions; keyboard/focus; repeated sessions |
| 2P adult + adult, then supervised family acceptance | Crossing sides, different heights, occlusion, one exits/returns, third person in background, both hands near same target |
| Phone/tablet to TV, if supported | Movement-to-display latency including casting; readability and actual camera placement |

Check at least Balloons (hits/duel), Count (precise selection), Runner (body gestures), Glass (reach/canvas) and Car (calibration/steering); smoke all remaining registered games. Keep music audition and low/reduced-motion usability explicit. No population-wide FPS or developmental claims follow from this matrix.

## Compact result record

Use technical summaries without child names, recorded video/audio, persistent identity or full body trajectories:

| Field | Record |
| --- | --- |
| Build | Commit, branch, immutable deployment URL, test date |
| Environment | Device model, OS/browser versions, viewport/orientation, model/backend, 1P/2P, lighting/setup |
| Scenario | Steps, expected behavior, observed behavior, pass/fail/not tested |
| Timing | Cold/warm startup; inference/render/update p50/p95 and sample count; input age from frame to use; adult-observed display latency separately |
| Accuracy | Intended hits, missed hits, false hits; time with required hands/body valid; identity swaps/recovery |
| Lifecycle/network | Track/loop/timer cleanup; domains and request purposes during load/play/finish; no image/video collection for the report |
| Follow-up | Backlog ID, severity, reproducible steps, owner, next check |

Run comparable scenarios on the same device/settings when measuring alternatives. A different model, renderer or UI is not an improvement until the recorded comparison supports it. Export diagnostics only through an explicitly approved, parent-controlled mechanism; none is introduced by these documents.

## Production gate

A runtime PR needs an accepted scope, reviewed source diff, relevant green automated checks, completed P0 cases, applicable real-device checks, known remaining limits and a coherent rollback target. Input/rendering changes also need comparison data; visual changes need reviewed screenshots, and audio changes need listening.

The owner then explicitly approves production promotion. Verify the deployment source SHA and actual domain after promotion and refresh current state. A documentation PR cannot grant that approval, certify privacy/legal compliance, establish offline support or declare the prototype commercially ready.

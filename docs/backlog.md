# P0/P1 backlog

Updated: 2026-10-17. Status: proposed work order for owner review.

Baseline and evidence: [state reconciliation](state-reconciliation-2026-10-17.md). These are document IDs, not created GitHub issues. No runtime implementation is authorized by this backlog.

**Status rules:** open in production; candidate implemented; acceptance pending; accepted and deployed. A green synthetic test or Ready deployment alone cannot move an item to accepted and deployed. Record the closing SHA, deployment and applicable device evidence.

P0 means a blocker to a reliable supervised test baseline or a larger refactor. P1 means required stabilization/release work. Priority is not an assertion of a confirmed video leak or physical harm.

## First sequence

1. Review this documentation and the scope of existing PR #1. Choose full-candidate acceptance or request an isolated P0 repair. Owner: Aurel. No additional coding scope is implied.
2. Complete P0-01 through P0-03 on the chosen exact preview with an adult. Implementer records automated evidence; owner supplies available-device observations. Stop further feature work if these fail.
3. Record device/input measurements, then address P1 items in dependency order. Preserve unaccepted ambitions in the backlog; do not turn a shorter next action into a silent scope cut.
4. Promote only after explicit production approval. Refresh `PROJECT_STATE.md` after the promotion; preserve the dated audit.

## P0 — current production blockers

| ID / task | Production / existing candidate | Acceptance criteria | Dependency / owner |
| --- | --- | --- | --- |
| P0-01 Camera and resource termination | Open on `88a2bf6`. PR #1 has shared cleanup, late-stream disposal, background handling and a model-failure regression | On normal finish, exit, error, cancelled loading/countdown, late camera resolution and hidden/page exit: every acquired track ends, video detaches, music stops, pending session callbacks cannot reactivate it. Repeat start/finish without leaked tracks | Exact preview + source record first. Implementer; owner for Android/Safari evidence |
| P0-02 Cancelled inference/model work | Open on production. Candidate has session epochs, inference lock and serialized model creation | Stop/restart during inference and model loading; a late result cannot update new state, dispose its detector, change screen or schedule another old loop. No overlapping inference or conflicting model replacement. Cover repeated 1P/2P switches | P0-01, candidate source/test review. Implementer |
| P0-03 Owned timers and transitions | Open on production. Candidate replaces unowned countdown/results transitions | Cancel each startup stage, exit during countdown, rapid repeated starts, finish then return/replay, background/return. Exactly one visible active screen and one current session; no delayed results overwrite menu; no orphan timers/music | P0-01/P0-02. Implementer + owner |

The 22-test rerun supports the existing candidate's covered synthetic cases; it does not close the broader device criteria above. Prefer completing/reviewing that candidate over independently implementing the same repair again.

## P1 — stabilize and prepare an alpha

| ID / task | Scope and current status | Done when | Depends on / owner |
| --- | --- | --- | --- |
| P1-01 Stable 2P identity and explicit game roles | Open in both revisions. Spatial left/right slots can exchange identity; some games combine all palms with a first-pose controller | Per-game table defines solo, shared, turn-taking or duel rules. Crossing, occlusion, exit/re-entry and third-person intrusion never silently transfer score/control; uncertain identity triggers a defined recovery | P0s; implementer + owner approves role/identity rule |
| P1-02 Real input age, body/hand validity and device baseline | Candidate improves result expiry but timestamps inference completion. No measured capture-to-feedback latency or model benchmark | Track frame/result/use times and per-required-keypoint confidence. No hit/penalty from invalid or expired input. Record 1P/2P baseline on available Android Chrome and iPhone Safari; document unsupported environments and casting separately | P0s; implementer measures, owner runs physical cases |
| P1-03 Timing, geometry and one deliberate answer | Candidate has fixed simulation, answer layout/release gating and balloon geometry; production remains open | Equivalent elapsed-time scenarios at 15/30/60 update rates; narrow/landscape targets fit available space; exactly one answer per confirmation; per-game drawn/interacting geometry and reachable targets verified. Include non-cockpit games | P0s/P1-02; implementer |
| P1-04 Stable educational round contracts | Color-sort fix is in candidate. Broader color-target transitions and game-specific content remain open | Each attempt retains a valid correct answer until its end; rule changes do not strand old items. Rendered counts equal question counts. Color games have explicit distinct purposes; invalid camera intervals do not count as child errors | P1-02/P1-03; owner approves intended rules, implementer verifies invariants |
| P1-05 Baby policy and bounded whole sessions | Central penalty guards and per-round limits in candidate. No complete parent-selected cross-replay policy | All negative score/life paths obey the chosen baby rule, including feedback. Owner approves score visibility, round completion and parent session limits. Replay cannot silently evade a parent limit; exit always available | P0s/P1-04; owner + implementer |
| P1-06 Dependency, network and privacy baseline | Local inference intent matches source; actual runtime network trace and reproducible dependency/model inventory are open | Inventory exact library/model/font/asset versions and licenses; record network requests during startup/play/finish without capturing a child. Confirm no application video/audio upload; document hosting/CDN traffic separately. Define tested security headers and reproducible dependencies before external alpha | P0s; technical reviewer + owner. Separate specialist review before commercial release; no certification implied |
| P1-07 Release identity, setup and branch controls | Baseline/deployment mapped here; main is unprotected, no tags seen. Candidate adds CI/docs. Full Vercel settings still need readback | Re-read framework/root/commands/output/environment and Git production-branch settings without exposing secret values. Record rollback target, choose a consistent version/build SHA and tag policy. Owner decides repository visibility/license and whether to require PR/check protection; settings changes need their own authorization | P0s; implementer prepares, owner decides. No forced history reset |
| P1-08 Measured modularization ADR | TypeScript/Vite or another stack remains a proposal. Candidate extracts controls/cockpit/music only | Approved ADR states retained behavior, module boundaries, dependency/build implications and rollback. Migrate a small slice after baseline; preserve passing regression/device checks and demonstrate correct Vercel preview output. Model replacement requires a separate measured comparison | P0s, P1-02/03/04/06/07; owner + implementer |
| P1-09 Parent onboarding and accessible instructions | No complete guided onboarding/parent gate in production or candidate | Parent can understand camera setup, input loss and solo/2P roles. Short demonstrable instructions, reachable/low-motion alternatives, audio controls, keyboard/focus and TV readability have explicit acceptance. Record product choices before changing rules or art | P1-01/02/04/05; owner + UX/implementer |
| P1-10 Motion Lab scope acceptance | Cockpit, runner, density, maths, music, menu motion and dinosaur removal are already proposed in PR #1 | Owner accepts the exact scope; real steering direction/calibration, crouch/jump, age/tempo/content settings, audio audition and all retained games are checked. If not accepted, request a scoped follow-up rather than treating the candidate as canonical | P0s + relevant P1 checks; owner. No merge approval is recorded here |

## Deferred decisions and preserved ambition

Public/private and license choices, full art direction, a richer cooperative curriculum, a tracking-stack comparison, offline/PWA/store distribution, parent research, market positioning/pricing and commercial launch remain on the product roadmap. This reconciliation neither deletes them nor assumes an architecture, price or release date. New minigames and broader redesign follow a stable measured core.

The old eight-week roadmap is a sequence of outcomes, not an automatically renewed calendar promise. Each session records a concrete next action, owner, evidence of done and a working estimate. Schedule reminders only through a separately authorized automation request.

# State reconciliation — 17 October 2026

Question: what is actually in the canonical repository and production, what is only proposed, and what must be resolved before further development or promotion?

Status: dated audit snapshot, proposed for review. Scope: repository metadata and relevant source, September handoff, October audit, Vercel dashboard evidence, production HTML identity and the existing Motion Lab candidate. No production code or project settings were changed by this audit.

## Evidence ledger

| ID | Evidence and result | Strength / limit |
| --- | --- | --- |
| E1 | [Repository](https://github.com/aurelbacho-cyber/zairas-universe): public, active, default `main`; branch metadata says `protected:false`; rulesets endpoint returned `[]` | Live GitHub metadata. The detailed branch-protection endpoint returned 403 for the integration; no administrative settings were changed |
| E2 | [Main commit](https://github.com/aurelbacho-cyber/zairas-universe/commit/88a2bf6cb56a73e696d0802283a8f4007fba9156): tree contains only `index.html`, Git blob `6cec71e311353d185ef756ce90db5a4102ae2ef9`, 104,049 bytes | Local Git object and GitHub contents agree |
| E3 | [Vercel overview](https://vercel.com/aurelbacho-cybers-projects/zairas-universe): production Ready, source `main` at E2; deployment ID `FQTg9twMPUnCee9gkvCXps69fG9P`, generated host `zairas-universe-h83ylk2ut-aurelbacho-cybers-projects.vercel.app` | Authenticated dashboard read. Ready establishes deployment state, not successful camera gameplay |
| E4 | HTTP download of [production](https://zairas-universe.vercel.app/) equals E2 byte for byte. Both SHA-256 values: `b1821e2139a4f60a832eb53ca120bd5408a66b95dc018c27cd6664ccfc238404` | 104,049 bytes each; confirms HTML identity, not the downloaded model or all CDN responses. Windows checkout line endings may give a different working-file hash; comparison used raw Git blob bytes |
| E5 | [Draft PR #1](https://github.com/aurelbacho-cyber/zairas-universe/pull/1): base E2, head `761003a05364920ef64f5ff9a062444f7aef9fd8`, branch `codex/motion-lab-2026-10-17`; open and unmerged | Live PR metadata plus source/test inspection |
| E6 | [CI run 39035534061](https://github.com/aurelbacho-cyber/zairas-universe/actions/runs/39035534061): completed, success, exact E5 head. Local `node --test tests/regressions.test.cjs`: 22 passed, 0 failed, Node v24.19.0 | CI includes Chromium smoke with synthetic camera/pose data; local rerun covered Node tests only. No new browser smoke or physical-camera test was performed here |
| E7 | Vercel overview lists Ready preview `8p3HsSuT2zj21aMu8nxgQs77vyM2` for E5's branch, linked to PR #1 | The deployment detail's exact source SHA and authenticated gameplay were not independently inspected in this audit |
| E8 | `claude/new-session-oppbyq` at `90f35707ff25cd2b6582814516671fb3874651a4` adds `lm2627` and `lm2627-app`; diff against E2 leaves root `index.html` unchanged | Separate football application in the same repository. Its Vercel preview is not a newer Zaira release |
| E9 | Handoff dated 2026-09-17 and read-only audit dated 2026-10-04 | Historical intent and diagnostics; not live deployment evidence. E2 is still the same source revision that they inspected |

No tags were present in the cloned repository. The SHA/blob/deployment record above fixes the reference without inventing a released semantic version. A release tag is still a proposed process action.

## Implemented in main / production

[Source links below use the exact E2 revision](https://github.com/aurelbacho-cyber/zairas-universe/blob/88a2bf6cb56a73e696d0802283a8f4007fba9156/index.html).

| Layer | Observed implementation | Evidence |
| --- | --- | --- |
| Runtime | One HTML file with CSS, screens, global state `A`, Canvas 2D game classes and Web Audio | Whole tree; `startGame` lines 369–389; loop 507–537 |
| Camera/model | `getUserMedia`, `audio:false`, constraint fallback, TensorFlow.js 4.17.0 and pose-detection 2.1.3; MoveNet SinglePose or MultiPose Lightning | Scripts lines 8–9; camera/model lines 393–422 |
| Input | Cover/crop and mirror transform; palm extrapolation 35% beyond wrist; clap, body jump/duck and dwell selection | Lines 541–648. Extrapolation is not an observed hand landmark |
| Profiles | `baby` / `kid` / `pro`, 1P/2P setting, lives or timed play, score/jokers, skeleton switch | State/settings, `GAME_META` 305–324, HUD/lives 436–504 |
| Shared systems | Lane helpers, synthetic effects and music controls, glass wiping and diagnostic display | Helpers and game classes; existence does not prove fairness on a narrow screen |
| Delivery | Static HTTPS production and separate branch previews | E3/E4/E7 |

### Registry inventory

The registry contains **15 games plus one diagnostic**, not 16 finished multiplayer games.

| IDs | Main / production | Candidate PR #1 |
| --- | --- | --- |
| `balloons` | Palm targets; duel available; lane spawning | Retained; changed density, geometry and burst effects |
| `sort`, `space` | Fruit/vegetable hand sorting; body-controlled space game | Retained; still need per-game input/2P acceptance |
| `runner`, `boat`, `car` | Body runner, river steering, wrist-controlled car | Retained; runner calibration and major cockpit/steering changes |
| `colorpop`, `colorsort`, `colormatch` | Three color games | Retained; color-sort round-rule fix; broader rule/accessibility review outstanding |
| `count`, `order`, `math` | Counting, ordered numbers, addition | Retained; answer selection/layout and cognitive difficulty changes |
| `glass` | Shared palm wiping; no-life metadata | Retained and explicitly marked cooperative |
| `hunt`, `nest` | Dinosaur duel/cooperation experiments | Removed in the candidate; still present in production |
| `debug` | Palm/pose/gesture diagnostics | Retained; not counted as a game |

Global 2P detection is not evidence that each game's rules support two distinct players. `playerPoseSlots()` on main sorts by screen x (553–557), and the candidate retains spatial assignment. Identity may swap when players cross.

## Reconciliation findings

Classifications distinguish design agreement, implementation drift, ambiguity and gaps in validation.

| ID / classification | Expected from the handoff or release requirement | Observation, impact and action | Owner / evidence |
| --- | --- | --- | --- |
| R01 — Matches design | One canonical codebase; HTTPS delivery | Main and production match. Retain E2 as the baseline and PRs as proposals | Implementer; E1–E4, high confidence |
| R02 — Implementation drift | A session releases camera resources on every terminal path | Main `endGame()` (1947–1967) does not call `stopAll()`; startup catch (385–389) also lacks shared cleanup. Camera may remain active after a normal finish/error. P0-01 | Implementer after code approval; source + unchanged October diagnostic, high confidence |
| R03 — Implementation drift | Cancelled sessions cannot change the next screen/game | Main `startLoop()` (507–537) resumes after an await without session identity; countdown/results timers are unowned (426–434, 1949–1967). P0-02/P0-03 | Implementer; direct source + earlier diagnostic, high confidence |
| R04 — Validation gap | P0 corrections work on supported devices | Candidate has session epochs, owned waits, late-stream disposal and cleanup (`index.html` 440–514, 588–640, 1641–1662); 22 regressions pass. These fixes are unmerged and device acceptance remains open | Implementer + owner; E5/E6, synthetic-test confidence only |
| R05 — Implementation drift | Stable player identity and fair hand input | Spatial P1/P2 assignment remains in both revisions. Candidate expires pose results after 300 ms, measured from inference completion (601,607), not camera-frame capture; per-hand validity and end-to-end input age still need explicit checks | P1-01/P1-02; source, high confidence on implementation; physical impact unmeasured |
| R06 — Implementation drift / partial candidate remedy | Baby policy, timing and answer geometry are consistently fair | Main has frame-dependent updates, distributed penalties, overlapping choices and repeated selection risks documented in the October audit. Candidate supplies fixed-step simulation, central baby guards and selection changes. Do not mark production fixed | P1-03/P1-04/P1-05; E5/E6; per-game/device acceptance outstanding |
| R07 — Design ambiguity | Version, release and game-count labels identify a known build | Main title says v4 with v5/v6 comments; candidate calls itself Motion Lab alpha and removes two titles. No semantic release/tag is established | P1-07; owner accepts release identity and scope; source, high confidence |
| R08 — Validation gap | Setup and rollback are reproducible | Git source, domain and production commit are confirmed. Current framework/root/build overrides and environment-variable presence were not readable: Chrome automation was blocked by another extension UI. Historical setup was Other, root `./`, no custom build/API key | P1-07; re-read Vercel settings, do not copy historical values as current fact |
| R09 — Validation gap | Local inference and privacy claims have evidence | Application code requests no microphone and uses local MoveNet; this audit did not capture real model/CDN traffic. No offline, end-to-end no-upload or legal-compliance certification follows from source inspection | P1-06; technical reviewer + owner; source only |
| R10 — Design ambiguity | Architecture changes follow a measured decision | TypeScript/Vite modularization and model comparisons are proposals. Main has no build system/tests/CI; candidate extracts three JS modules and adds tests/CI, without completing that target architecture | P1-08; owner approves ADR after baseline measurement |
| R11 — Matches separation requirement | Other tools work through isolated changes | E8 is unrelated application content. Do not merge it as a Zaira upgrade or count its tests as Zaira evidence | Implementer; Git diff, high confidence |

The current-state note and backlog change as a result of this reconciliation: production remains the original prototype; PR #1 is the existing repair candidate; P0s stay open for production until accepted and promoted. No new runtime semantics or product decisions are approved by writing this report.

## What remains a plan

Full modularization, a selected tracking replacement, measured performance baselines, stable 2P identity, guided parent onboarding, a parent gate, whole-session controls across replay, spoken instructions, an offline cache, validated learning outcomes and commercial readiness remain unverified or unimplemented. Candidate round limits (60 active seconds in timed mode, 180 active seconds maximum, five wall-clock minutes) do not establish the planned parent-controlled multi-round session policy.

Follow [the backlog](backlog.md) for next work and [testing/release](testing-and-release.md) for the evidence needed to close it. This audit is not a full re-review of every visual/gameplay change in PR #1.

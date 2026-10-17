# Development and deployment

Read [current state](../PROJECT_STATE.md) first. Setup facts below were checked on 17 October 2026; the dated report owns exact SHA/hash evidence.

## Verified environment

| Item | Confirmed state |
| --- | --- |
| Source | Public GitHub repository `aurelbacho-cyber/zairas-universe`, default `main` |
| Production branch/source | Vercel production overview identifies `main`, commit `88a2bf6cb56a73e696d0802283a8f4007fba9156` |
| Production project/domain | `aurelbacho-cybers-projects/zairas-universe`; <https://zairas-universe.vercel.app/> |
| Immutable production deployment | [Deployment detail](https://vercel.com/aurelbacho-cybers-projects/zairas-universe/FQTg9twMPUnCee9gkvCXps69fG9P); generated host <https://zairas-universe-h83ylk2ut-aurelbacho-cybers-projects.vercel.app/> |
| Repository link | Vercel overview links this GitHub repository; source SHA and served HTML match |
| Preview mechanism | Existing Motion Lab and Claude branches have separate Ready previews; overview links Motion Lab to draft PR #1 |
| Current production code shape | Static `index.html`; no `package.json`, lockfile, custom build config, backend or automated suite on audited main |
| API keys | The application source has no API-key configuration requirement. Existing Vercel environment-variable presence was not inspected; no key values were accessed |
| Dependencies | Pinned TensorFlow.js and pose-detection URLs; remote font/model assets. Network required; offline support is not established |

The full [Vercel build settings](https://vercel.com/aurelbacho-cybers-projects/zairas-universe/settings/build-and-deployment) and [Git settings](https://vercel.com/aurelbacho-cybers-projects/zairas-universe/settings/git) need a later readback. Historical setup in the original conversation was **Other**, root **`./`**, without custom build commands or required environment keys. These historical values are not a current settings audit. Chrome allowed the overview read, then blocked further automation because another extension UI was open; a new settings tab did not resolve the block. No setting was saved.

## Working locally

Use an isolated checkout of the canonical repository. Start a branch from the reviewed main commit; do not work in synced reference files or an unrelated application branch.

```sh
git clone https://github.com/aurelbacho-cyber/zairas-universe.git
cd zairas-universe
git switch -c docs/your-topic origin/main
python -m http.server 8080 --bind 127.0.0.1
```

Open `http://localhost:8080/` on the same computer. Python 3 is an optional static-server convenience, not a production dependency. A phone visiting a computer's plain LAN HTTP address does not inherit localhost's camera context; use the HTTPS preview for remote-device checks. Opening an HTML attachment or an embedded messenger preview is not the supported test flow.

Main needs no install/build step. Test scripts and the three `src/*.js` modules exist in the Motion Lab candidate only. Use its exact revision for the commands in [testing/release](testing-and-release.md); do not report a missing test file on main as a failed test.

## Branch and PR workflow

1. Refresh main/head SHAs and existing PRs; avoid duplicating an already proposed fix.
2. Create a small branch from the appropriate reviewed base. This documentation branch is based on original main and uses new paths to coexist with PR #1.
3. Make the authorized change, read back the diff and run checks appropriate to it. Never include credentials, personal tester documents, video, body traces or unrelated app directories.
4. Push only the branch and open a PR. Link the exact source SHA, scope, evidence, gaps and rollback plan. A branch push may create a Vercel preview automatically.
5. Check the preview's deployment detail and exact source SHA. A branch URL is a moving alias; record the generated per-deployment URL as well.
6. Obtain explicit approval before production code changes/promotion. Required checks and device evidence apply to runtime PRs. Documentation review is not runtime acceptance.
7. Merge/promote only within that approval, then verify the production source/domain and refresh current state.

Main currently reports `protected:false`, with no repository rulesets returned. This describes the observed configuration, not permission to bypass review. Repository protection, visibility and deployment access remain unchanged by this audit. A separate owner decision should establish the desired controls.

## Existing candidate and unrelated branch

[PR #1](https://github.com/aurelbacho-cyber/zairas-universe/pull/1) uses branch `codex/motion-lab-2026-10-17`. Its [preview alias](https://zairas-universe-git-codex-mot-f14fbd-aurelbacho-cybers-projects.vercel.app/) was reported Ready in the dashboard; PR documentation reports authentication for anonymous access. Keep the existing access protection. This audit did not run authenticated gameplay there.

`claude/new-session-oppbyq` adds the football app under `lm2627` / `lm2627-app`, while retaining the original root game. Do not use that branch's activity, build output or tests as evidence of Zaira modernization.

## Rollback and release identity

The known original source and deployment are recorded above. Prefer a reviewed revert PR for an accepted code regression and the project's normal Vercel rollback/promotion workflow for deployment recovery. The owner must authorize the production action. Do not force-reset shared main, overwrite another contributor's branch, or delete reference deployments as housekeeping.

A rollback must restore a coherent HTML/script/model/asset combination. Before introducing a bundler, self-hosted model or service-worker cache, extend the rollback check to those artifacts. Existing v4/v5/v6 labels are historical; no new semantic version or release tag was created in this audit.

# Zaira's Universe — current project state

Updated: 2026-10-17. Status: prototype; documentation proposed for review.

## Current baseline

- Canonical repository: `aurelbacho-cyber/zairas-universe`; default branch: `main`.
- Verified production source: `88a2bf6cb56a73e696d0802283a8f4007fba9156`.
- Production: <https://zairas-universe.vercel.app/>. Its HTML was downloaded and compared byte for byte with the Git blob on 2026-10-17: identical.
- Main contains a single `index.html`: 15 games plus the palm diagnostic. It has the lifecycle defects recorded in [the reconciliation report](docs/state-reconciliation-2026-10-17.md).
- [Draft PR #1](https://github.com/aurelbacho-cyber/zairas-universe/pull/1), reviewed at `761003a05364920ef64f5ff9a062444f7aef9fd8`, contains proposed lifecycle, timing, input and gameplay changes. It is not production. Its 22 Node regressions passed again in this audit; its recorded CI run also succeeded. Physical device acceptance is outstanding.

## Confirmed constraints

Use branches and PRs. Production code changes and production promotion require explicit owner approval. Keep camera processing local and preserve the project's movement/learning ambition, baby accessibility and two-player direction. A framework or tracking-model replacement is a proposal until separately approved and measured.

Implementation evidence establishes current behavior; it does not silently replace accepted product intent. The September handoff and October audit are historical inputs. The dated reconciliation report records their relationship to the actual code and deployments.

## Next action

Review the [P0/P1 backlog](docs/backlog.md), then assess PR #1 against the [release checks](docs/testing-and-release.md). Prioritize camera/session termination before a new child test or a larger migration. Decide whether to accept the full Motion Lab scope for testing or request a smaller lifecycle-only change; neither decision is implied by this documentation PR.

Owner: Aurel for product/code approval and device observations; implementer for approved changes and reproducible checks. Done when the chosen candidate has an exact SHA/deployment, the P0 checks pass, and the owner has made an explicit promotion decision. Effort: one focused acceptance session per available device, followed by separately scoped fixes if needed; no release date is claimed.

See [documentation index](docs/README.md) for setup, evidence, ownership and remaining gaps. Refresh this file after a merge or deployment change; do not rewrite the dated audit as if it had tested a newer build.

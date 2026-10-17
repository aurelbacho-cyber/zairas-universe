# Project documentation

This documentation reconciles the September handoff, the October audit and the repository/deployment evidence read on 17 October 2026. It proposes the working baseline for review; it does not authorize a production change.

| Document | Owns |
| --- | --- |
| [Current state](../PROJECT_STATE.md) | Short entry point and next action; update after a material state change |
| [State reconciliation](state-reconciliation-2026-10-17.md) | Dated evidence, feature inventory and drift classifications |
| [P0/P1 backlog](backlog.md) | Priorities, acceptance criteria, dependencies and current delivery status |
| [Development and deployment](development-and-deployment.md) | Current setup, branch workflow, deployment identity and rollback |
| [Testing and release](testing-and-release.md) | Test scope, device record and production acceptance gates |

## Source ownership

- Git commit and file references establish implemented behavior at that revision.
- Vercel's production deployment and the response from the production domain establish what is served. A ready preview does not establish production promotion or functional acceptance.
- Owner decisions establish intended product behavior. Chat discussion, proposed ADRs and implementation choices are not interchangeable with approval.
- Tests establish behavior only for their inputs and environment. Synthetic poses do not establish physical tracking quality.
- The exact current baseline and candidate are recorded in the dated report. Refresh volatile facts before implementing against them.

Historical inputs read for this reconciliation: `ZAIRAS_UNIVERSE_MASTER_HANDOFF_2026-09-17.md`, `ZAIRAS_UNIVERSE_AUDIT_2026-10-04.md`, and the latest available messages in the referenced **Zairas world** conversation. The original documents remain intact outside this repository. They are not copied wholesale into a public repository; personal tester material and general AI-tool advice are outside this documentation change.

PR #1 already adds a root README, CHANGELOG and modernization note. This PR uses distinct paths so those documents can coexist. Its runtime changes still need their own review. The source-specific references here remain pinned to the reviewed commits even if either PR is merged first.

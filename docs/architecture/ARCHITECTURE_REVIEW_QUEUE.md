# ARCHITECTURE REVIEW QUEUE

| Field | Value |
|-------|--------|
| Owner | architect |
| As of | 2026-07-15 |

## Process

Submit via `.agent-comms/` to `architect` (cc `master-pm`, `integration`) with type `REQUEST`, including: purpose, proposed design, affected modules/files, schema/env/connection changes, permissions, risks, alternatives, test/migration/rollback plans.

Outcomes: APPROVED | APPROVED WITH CONDITIONS | CHANGES REQUIRED | REJECTED | DEFERRED.

## Open reviews / architect-initiated findings

| ID | Topic | Requester | Priority | Status | Notes |
|----|-------|-----------|----------|--------|-------|
| ARQ-001 | AI list schema drift (19 files) vs shared baseline | architect (finding) | HIGH | CHANGES REQUIRED | Owner: ai-governance — publish delta + request review before consumers adopt |
| ARQ-002 | `HVCG_Approvals` column expansion on Ops tip | architect (finding) | HIGH | CHANGES REQUIRED | Owner: operations — Approvals is shared; submit ADR/review or revert |
| ARQ-003 | Shared index residue (CF-001) | QA / master-pm | HIGH | DEFERRED to QA path | Architect affirms exclusive-index pattern; no new shared index edits |
| ARQ-004 | Renewal automation ownership | architect (finding) | NORMAL | OPEN | operations + platform — choose SoR |
| ARQ-005 | Retire duplicate agent `operations-hub` | architect (finding) | NORMAL | OPEN | master-pm registry hygiene |

## Closed

| ID | Topic | Outcome | Date |
|----|-------|---------|------|
| ARQ-006 | Sprint 12 Data Engineering agent registration | **APPROVED** — entry active in orch registry; least-privilege paths; see ADR-0005. Parent ATLAS-T-1202 remains Waiting Review for full 18-agent pack (QA then architecture gate). | 2026-07-20 |
| ARQ-007 | HVCG Executive Dashboard target architecture | **APPROVED** — Elite OS UX SoR; model-driven admin; ADR-0006; Master PM sign-off pack published | 2026-07-20 |

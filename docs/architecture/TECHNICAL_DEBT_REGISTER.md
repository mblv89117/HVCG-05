# TECHNICAL DEBT REGISTER — Architecture

| Field | Value |
|-------|--------|
| Owner | architect |
| As of | 2026-07-15 |

Severity: CRITICAL | HIGH | MEDIUM | LOW

| ID | Description | Modules | Sev | Cause | Business impact | Technical impact | Recommended fix | Owner | Target | Status |
|----|-------------|---------|-----|-------|-----------------|------------------|-----------------|-------|--------|--------|
| TD-ARCH-001 | Full SharePoint list catalog replicated into every module worktree | all | HIGH | Worktree branching from monorepo tip | Merge noise; false ownership | Silent drift risk; huge diffs | Treat `src/sharepoint/lists/HVCG_*.json` core set as shared SoR; modules commit exclusive lists only; add CI hash check | architect + master-pm | next integration | OPEN |
| TD-ARCH-002 | AI worktree schema drift on 19 AI lists vs baseline | ai-governance | HIGH | Uncommitted / local evolution of AI contracts | Integration breakage for JobId consumers | Column count drift (e.g. AIJobs 34→45) | Freeze baseline; publish delta; architecture review before parents consume | ai-governance | before AI handoff | OPEN |
| TD-ARCH-003 | Ops tip mutates shared lists (`HVCG_Approvals` +Amount/Requester, knowledge lists) | operations | HIGH | Shared schema edited on module branch | Approval consumers disagree on required fields | Cross-module contract break | Route Approvals changes via architect ADR; restore non-owned lists to baseline or exclusive fork | operations | with CF-001 cleanup | OPEN |
| TD-ARCH-004 | Locked shared indexes still diverge on Ops tip (QA CF-001 / DEF-QA-001) | operations, integration | HIGH | Legacy mixed commits | Unsafe tip merge | Index SoR corruption | Path-filter merge or tip strip per QA | operations + integration | current sprint | OPEN (QA-tracked) |
| TD-ARCH-005 | Dual agent IDs `operations` and `operations-hub` | operations, master-pm | MEDIUM | Registry bootstrap inconsistency | Misrouted bus messages | Conflict checks incomplete | Retire `operations-hub`; keep `operations` | master-pm | immediate | OPEN |
| TD-ARCH-006 | AI naming dual pattern `HVCG_AI*` vs `HVCG_AI_*` | ai-governance | LOW | Historical layering | Confusion Tasks vs AI_Tasks | Docs / query errors | Document freeze (done in NAMING); no third pattern | architect | done-doc | ACCEPTED |
| TD-ARCH-007 | Multiple audit lists without federation rules | ai, portal, platform | MEDIUM | Domain isolation | Incomplete audit stories | Duplicate audit writes | Publish audit federation ADR | architect | next standards pack | OPEN |
| TD-ARCH-008 | Renewal flow functional overlap (`HVCG_RenewalReminders` vs `HVCG_OpsRenewalAlerts`) | operations, platform | MEDIUM | Parallel delivery | Double notifies | Divergent business rules | Architect assigns single SoR flow family | architect + operations | before dual-live | OPEN |
| TD-ARCH-009 | CRM MAIN dirty tree mixed with agent-comms checkout | crm, agent-comms | HIGH | Shared working tree | Wrong release narrative | Contaminated commits | Segregate CRM WIP; keep comms tip clean (QA DEF-QA-002) | crm + master-pm | current | OPEN (QA-tracked) |
| TD-ARCH-010 | Env var dual notation `hvcg_*` vs `HVCG_*` in docs/flows | all | LOW | Documentation aliases | Mis-binding in Maker | Support burden | Canonical = solution logical name; alias table in NAMING | architect | done-doc | ACCEPTED |
| TD-ARCH-011 | Architecture standards pack previously incomplete | architect | MEDIUM | Role just stood up | Inconsistent module designs | Rework | Publish SYSTEM/NAMING/CATALOG/DEBT/ADRs (this pack) | architect | this session | IN_PROGRESS |

## Decisions for Manny (architect will not invent)

None new from this inventory beyond existing Master open set (D-002 canvas; D-003 merges). External sharing / Production architecture unchanged — continue hard forbid.

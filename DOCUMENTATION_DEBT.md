# Documentation Debt

| Field | Value |
|-------|--------|
| Title | Documentation Debt Register |
| Purpose | Track missing, stale, contradictory, or unsafe documentation |
| Audience | docs, master-pm, architect, integration, module agents |
| Owner | docs |
| Status | DRAFT |
| Last verified | 2026-07-15 |
| Related | [DOCUMENTATION_STATUS.md](DOCUMENTATION_STATUS.md), [docs/KNOWN_LIMITATIONS.md](docs/KNOWN_LIMITATIONS.md) |

## Severity key

| Severity | Meaning |
|----------|---------|
| CRITICAL | Unsafe deployment, security, rollback, or Production guidance |
| HIGH | Core implementation or operations undocumented |
| MEDIUM | Incomplete module or user guidance |
| LOW | Formatting, cross-linking, or minor clarity |

## Open debt

| ID | Missing / stale | Severity | Audience | Module | Risk | Owner | Target | Status |
|----|-----------------|----------|----------|--------|------|-------|--------|--------|
| DOC-DEBT-001 | `MASTER_PROJECT_STATUS.md` cites ~68% and ~52% completion | HIGH | Program | master-pm | Wrong executive signal | master-pm | Immediate | OPEN — REQUEST sent |
| DOC-DEBT-002 | `PROJECT_STATUS.md` / handoff / next-session diverge across worktrees; not SoR | HIGH | All | multi | Agents follow stale module status | master-pm + modules | Sprint | OPEN |
| DOC-DEBT-003 | `docs/crm/ACCEPTANCE_REPORT.md` hash mismatch MAIN vs others | HIGH | QA / CRM | crm | False acceptance claims | crm | Before RC | OPEN — REQUEST sent |
| DOC-DEBT-004 | Executive/portal/finance/ops module docs not on MAIN | HIGH | Integration | multi | Merges without docs | modules | Pre-integration | OPEN — REQUEST sent |
| DOC-DEBT-005 | Release gate pack incomplete (notes/changelog/rollback/known issues) | CRITICAL | Release | integration | Unsafe RC declaration | integration | Before RC | OPEN — REQUEST sent |
| DOC-DEBT-006 | Architecture: stub `docs/architecture/ARCHITECTURE.md` vs `SYSTEM_ARCHITECTURE.md` | MEDIUM | Devs | architect | Readers use weaker stub | architect | Next arch pass | OPEN — REQUEST sent |
| DOC-DEBT-007 | User guides fold empty (`docs/USER_GUIDES/`) | MEDIUM | End users | docs | No role-based guidance | docs | Post module VERIFY | OPEN |
| DOC-DEBT-008 | Troubleshooting library empty | MEDIUM | Ops | docs | Incident reliance on chat | docs | Ongoing | OPEN |
| DOC-DEBT-009 | No systematic secrets scan of markdown | CRITICAL | Security | docs | Accidental exposure | docs | Before RELEASED | OPEN |
| DOC-DEBT-010 | SOP review interval not evidenced (90-day) | LOW | Ops | docs | Process drift | docs | +90d | OPEN |
| DOC-DEBT-011 | Glossary incomplete for finance/portal entities | LOW | All | docs | Term drift | docs + modules | Ongoing | OPEN |
| DOC-DEBT-012 | README lacks documentation navigation section | LOW | Devs | docs | Discoverability | docs | This session | CLOSED — nav section added on docs branch |

## Debt by severity

| Severity | Count |
|----------|-------|
| CRITICAL | 2 |
| HIGH | 4 |
| MEDIUM | 3 |
| LOW | 3 |

## Closed

| ID | Resolution | Date |
|----|------------|------|
| DOC-DEBT-012 | README Documentation + Status SoR section on `cursor/documentation-knowledge-manager` | 2026-07-15 |

## Change history

- 2026-07-15 — Initial debt register from inventory.

## Bus note (2026-07-15)

DOC-DEBT-005/006 messages were auto-classified as CONFLICT by the bus because `relatedFiles` cited integration/architect paths. docs sent clarifying INFO: these are fact REQUESTs only; no ownership conflict intended.

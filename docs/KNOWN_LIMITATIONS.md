# Known Limitations (Documentation)

| Field | Value |
|-------|--------|
| Title | Known Limitations — Documentation Layer |
| Purpose | Publish documentation-system limits and unresolved truth conflicts |
| Audience | All agents |
| Owner | docs |
| Status | DRAFT |
| Last verified | 2026-07-15 |
| Related | [DOCUMENTATION_DEBT.md](../DOCUMENTATION_DEBT.md), [INDEX.md](INDEX.md) |
| Known limitations | This file lists documentation limitations only — not full product limitations |

## Documentation system

1. **Module docs not unified on MAIN.** Executive, portal, finance, operations deep docs exist primarily in module worktrees.
2. **Root `PROJECT_STATUS.md` is not program SoR.** Master PM directs program SoR to `MASTER_PROJECT_STATUS.md` (DEF-QA-004 accepted per master status).
3. **CRM report divergence.** `docs/crm/ACCEPTANCE_REPORT.md` and related CRM docs have conflicting hashes across MAIN vs module worktrees.
4. **Case-insensitive path collision.** Cannot create steward `docs/RELEASES/` beside integration `docs/release/` on macOS APFS.
5. **No document marked VERIFIED yet.** Steward files are DRAFT pending peer ACK and evidence pass.
6. **Release candidate docs incomplete.** Integration reports **NO RELEASE CANDIDATE**; release-gate checklist items remain open (see debt).
7. **Completion metrics conflict inside MASTER_PROJECT_STATUS.md.** Header cites ~68%; dashboard table cites ~52% — routed to master-pm (DOC-DEBT-001).

## Product / environment (documented elsewhere; not invented here)

- Production untouched (master-pm / integration evidence as of 2026-07-15).
- Dataverse deferred for v1 SoR (architecture).
- CRM canvas / connector consent owner decisions open (D-001, D-002).

## Change history

- 2026-07-15 — Initial known limitations from inventory.

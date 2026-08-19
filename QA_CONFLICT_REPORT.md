# QA Conflict Report

**Owner:** integration  
**As of:** 2026-07-15 15:38 PT

## Active conflicts

### CF-001 / bus `51f47dc4` — Ops locked shared indexes
- **Severity:** HIGH  
- **Branches:** `cursor/operations-hub` vs locked shared file policy  
- **Files:** flows/_index.json, definitions/_index.json, lists/_index.json, command-center-views.json  
- **Delta vs `b75b19b`:** +496 / −93 lines (still present at `a73929d`)  
- **Ops claim:** Exclusive packaging; agent will not edit further; parent replay via SHARED_FILE_RECOMMENDATIONS  
- **QA verdict:** Residue remains on tip → **merge of full branch tips is unsafe** without path filter or history cleanup  
- **Resolution path:** (A) Ops/integration create clean tip excluding those 4 files restored to merge-base, **or** (B) Master-approved path-filtered merge packet excluding them + parent append-only later  
- **Status:** OPEN (ownership redesign closed writer conflict; merge conflict risk remains)

## Cross-branch overlaps (exclusive packages)
- Owned-path registry overlaps: **none** (`check-conflicts.sh`)  
- Content overlap `b75b19b...HEAD` across READY modules: only root `PROJECT_STATUS.md` / `NEXT_SESSION.md` (expected)

## Working-tree contamination
- MAIN @ agent-communications: **399** dirty paths mixing CRM solution + bus traffic → CF-adjacent risk DEF-QA-002

## Duplicate implementations
- None detected for module exclusive assets this cycle  
- Portal uses exclusive `*/portal/_module_index.json` (good pattern)  
- Ops exclusive `operations-hub-views.json` coexists with divergent shared `command-center-views.json` on same tip (conflict residue)

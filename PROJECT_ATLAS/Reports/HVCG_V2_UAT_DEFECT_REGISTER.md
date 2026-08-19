# UAT Defect Register

**As of:** 2026-08-12  
**Status:** UAT-01 Owner-accepted; remaining workflows OWNER_ACTION_REQUIRED

| ID | Severity | Scenario | Defect | Status | Fix |
|----|----------|----------|--------|--------|-----|
| UAT-FIND-001 | MEDIUM | UAT-01 | Owner-facing intake missing / not discoverable | **`CLOSED_OWNER_ACCEPTED`** | Committed BA `3e364fa` · Elite `7365a83`; Lead `LEAD-DEV-1D90927215` |
| UAT-ENV-001 | HIGH (UAT integrity) | UAT runtime | Wrong Elite worktree on `:5180` | **CLOSED_CONTROLLED** | Provenance lock |
| UAT-ENV-002 | HIGH (UAT integrity) | UAT-01 entry | Local Owner Dev auth not working | **`CLOSED_REMEDIATED`** | `.env.local` gitignored · DEV allow gate · Production fail-closed |
| UAT-FIND-002 | MEDIUM | UAT-02 | Free Fit not Owner-facing on accepted UAT Elite runtime | **REMEDIATED_READY_FOR_RETEST** | Dev Hub→BA Free Fit bridge + Elite workbench uncommitted; Owner retest required |

**UAT-01 = OWNER_PASS.** **UAT-02 = REMEDIATED — awaiting Owner retest.** Do not close UAT-FIND-002 until Manny returns UAT-02 OWNER_PASS/FAIL.

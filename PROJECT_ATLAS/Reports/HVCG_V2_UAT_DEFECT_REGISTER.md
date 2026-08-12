# UAT Defect Register

**As of:** 2026-08-12  
**Status:** UAT-01 Owner-accepted; remaining workflows OWNER_ACTION_REQUIRED

| ID | Severity | Scenario | Defect | Status | Fix |
|----|----------|----------|--------|--------|-----|
| UAT-FIND-001 | MEDIUM | UAT-01 | Owner-facing intake missing / not discoverable | **`CLOSED_OWNER_ACCEPTED`** | Dev intake + New Prospect; Owner PASS; Lead `LEAD-DEV-1D90927215` |
| UAT-ENV-001 | HIGH (UAT integrity) | UAT runtime | Wrong Elite worktree on `:5180` | **CLOSED_CONTROLLED** | Provenance lock |
| UAT-ENV-002 | HIGH (UAT integrity) | UAT-01 entry | Local Owner Dev auth not working | **`CLOSED_REMEDIATED`** | `.env.local` (gitignored) + DEV allow gate; Production still fail-closed |

**UAT-01 = OWNER_PASS.** Do not auto-start UAT-02 — await Owner authorization to continue.

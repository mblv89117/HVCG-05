# Acceptance criteria — HVCG Executive Dashboard

Status against **live SWA Dev** (2026-07-20), signed-out + shell navigation. Owner interactive auth not completed this session.

| # | Criterion | Result | Notes |
|---|-----------|--------|-------|
| 1 | App loads without critical errors | **PASS** | HTTP 200, SPA mounts |
| 2 | Navigation works | **PARTIAL** | Links route; most targets are placeholders |
| 3 | Org context displayed | **PARTIAL** | HVCG branding; no live org record when unsigned |
| 4 | KPI cards show correct source info | **FAIL** | Sources labeled but values include fabricated $ |
| 5 | Last-refresh visible | **FAIL** | Not observed on live home |
| 6 | Alerts show severity | **PARTIAL** | Sample fallback warning; limited alert severity UI |
| 7 | AI briefing clearly labeled | **PASS** | "Development stubs only" / Safe Development stubs |
| 8 | Tasks create/update | **FAIL** | Not available on live (gated / stubs) |
| 9 | Approvals approve/reject | **FAIL** | Table visible; actions not verified as live |
| 10 | Clients / workspaces open | **FAIL** | Placeholder "comes next" |
| 11 | Projects managed | **FAIL** | Soon / gated |
| 12 | Revenue opportunities tracked | **FAIL** | Fabricated sample $ on home; no real pipeline module live |
| 13 | Capital opportunities managed | **FAIL** | Soon |
| 14 | Enterprise-value viewable | **PARTIAL** | Sample/Unavailable KPI only |
| 15 | Documents link securely | **FAIL** | Soon / gated |
| 16 | Empty/missing data handled | **PARTIAL** | Empty/gated states exist; sample $ undermines honesty |
| 17 | Mobile + desktop usable | **PARTIAL** | Layout adapts; content still blocked by defects |
| 18 | Role-based access | **FAIL** | Not enforced for required role matrix |
| 19 | No secrets in source/logs | **PASS** | Bundle scan clean for secrets |
| 20 | Rollback procedures verified | **PARTIAL** | Documented in Track10_Hosting_Teams_Rollback.md; not exercise-run this session |

**Score:** 3 PASS · 6 PARTIAL · 11 FAIL

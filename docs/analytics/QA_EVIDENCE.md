# Analytics QA Evidence

**Package version:** analytics-1.0.0  
**Environment:** Offline / Dev packaging (not production tenant proof)  
**Rule:** Fixture data is **SAMPLE** — never labeled production.

## Automated evidence

| Check | Command / asset | Result |
|-------|-----------------|--------|
| Catalog completeness | `python3 tests/analytics/test_metric_catalog.py` | Run in CI / local |
| Required metric IDs M-001…M-016 present | same | Required |
| Each metric has required lineage fields | same | Required |
| Alias collision (same alias → same formula id) | same | Required |
| Sample fixture arithmetic | `sample-data/analytics/metric-fixture.json` | SAMPLE only |
| Executive packaging regression | `tests/executive/test_executive_command_center.py` | Existing |

## Manual / design evidence

| ID | Scenario | Expected | Evidence |
|----|----------|----------|----------|
| AQ-01 | Missing AmountCollected month | Chart gap or BLANK — not invented 0 series as “history” | METRIC_CATALOG M-001 limitations |
| AQ-02 | DataProvenance=sample on EV | Excluded from verified midpoint | M-014 + PQ rule |
| AQ-03 | Contractor opens exec finance | Finance tiles hidden | PERMISSIONS.md |
| AQ-04 | Open pipeline includes Won | Must exclude — only WinLossStatus=Open | M-002 formula |
| AQ-05 | Capital Closed in sum | Excluded from M-013 | Formula |
| AQ-06 | Approval without CompletedDate | Excluded from median | M-009 |
| AQ-07 | Zero critical funding milestones | Readiness BLANK not 100% | M-011 |
| AQ-08 | Fixture vs live | Banner / provenance sample | USER_GUIDE |

## Sign-off

| Role | Status |
|------|--------|
| Analytics Product Team | Packaged — awaiting QA & Architecture review |
| Self-approve / Production release | **Not performed** (product rule) |

## Gaps acknowledged

- Live tenant refresh proof deferred to Owner-gated Power BI schedule.
- App Insights adoption series deferred until Elite OS wiring completes.
- EnterpriseValue list may be migration-gated per environment.

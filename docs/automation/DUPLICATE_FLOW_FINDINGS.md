# Duplicate-Flow Findings

**Date:** 2026-07-20  
**Owner:** Automation Product Team

## Confirmed overlaps

| Pair | Overlap | Resolution |
|------|---------|------------|
| `HVCG_WeeklyStatusSummary` (Mon ~06:30 ops + exec attention digest) vs `HVCG_ExecutiveWeeklyBrief` (Mon 07:45 KPI digest) | Two Monday executive-facing digests | **Resolved (2026-07-20):** WeeklyStatusSummary is **ops digest only**; ExecutiveWeeklyBrief owns Owner KPI brief. |
| `HVCG_OpportunityStageChangedNotify` (Stage→Won Teams) vs `HVCG_OpportunityWonCloseout` (Won Teams + closeout) | Dual Teams posts on Won | **Keep both functions; dedupe outbound:** StageChanged skips Teams when Stage=Won if WonCloseout handles notify; or set `HVCG_CRM_ENABLE_TEAMS_NOTIFY` and post only from WonCloseout for Won. Documented in CRM Teams spec. |
| Catalog ghosts `HVCG_PaymentPastDueAlert` / `HVCG_ChangeRequestIntake` (listed in root catalog without JSON) | Inventory drift | **Resolved** — build sheets added; retained in active set for Finance / approval routing. |
| Speculative Exec-release-out-of-scope scaffolds | Active catalog bloat | **Archived** to `src/power-automate/archive/exec-dashboard-deferred/` — StaleOpportunityAlert, MeetingPrepAndFollowUp, CapitalReadinessAlert, ClientNotificationApproved |

## Not duplicates

| Pair | Why distinct |
|------|----------------|
| `HVCG_CreateDocumentRequests` vs `HVCG_MissingDocumentReminders` | Create vs remind |
| `HVCG_TaskDueSoonReminders` vs `HVCG_OverdueTaskEscalation` | Before due vs after due |
| `HVCG_DeliverableApproval` vs `HVCG_ApprovalOutcomeNotify` | Request vs outcome |
| `HVCG_CapitalReadinessAlert` vs `HVCG_CapitalFundingStatusNotify` | Proactive readiness vs status-change bridge |
| `HVCG_AutomationFailureDigest` vs per-flow `Failure_Notify_Admin` | Central digest vs immediate stage failure |

## Packaging hazard (not dual runtime)

Flows may exist as `flows/*.json` + `definitions/*.json` + optional solution `Workflows/` copy. Treat as **one logical flow**; Maker import once per environment.

## Rule going forward

Before adding a flow: search inventory `automationName` and `priorityTheme`. Prefer extending an existing recurrence with a clearly named step group over a second schedule that emails the same audience.

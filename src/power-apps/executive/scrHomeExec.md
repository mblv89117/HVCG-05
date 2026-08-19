# Screen Spec — scrHomeExec (Executive Command Center)

**App:** HVCG OS Command Center  
**Audience:** Owner (Manny) only for finance KPI tiles  
**Module path:** This file is the **canonical** executive screen spec.  
**Shared baseline:** `src/power-apps/screens/scrHomeExec.md` (do not overwrite without merge).  
**Related:** `docs/executive/SCREEN_SPECS.md`, `ExecutiveNamedFormulas.fx`

## Purpose

Single low-noise operating surface: pipeline, MRR, cash/AR, capital, capacity, approvals, risks, decisions, meetings.  
**Exclude:** routine doc reminders, low-priority chores, raw AI drafts.

## Data connections (SharePoint)

Bind galleries/tiles to **executive views** in `src/sharepoint/views/executive-views.json` (or equivalent filtered collections).

| Collection / view | Formula hint |
|-------------------|--------------|
| `colExecPipeline` | CEO Open Pipeline |
| `colExecCommit` | CEO Commit Forecast |
| `colExecMRR` | CEO Active MRR Clients |
| `colExecAR` | CEO Outstanding AR |
| `colExecCash` | CEO Cash Collected Mirror filtered by `varCashPeriod` |
| `colExecCapital` | CEO Active Capital Book |
| `colExecDecisions` | CEO Executive Decision Queue |
| `colExecRisks` | CEO Major Risks |
| `colExecApprovals` | Union Deliverables + Expense Approvals |
| `colExecCapacity` | CEO Capacity Snapshot |
| `colExecMeetings` | CEO Upcoming Meetings (DateAdd Today 14) |
| `colExecProjectsRisk` | CEO Projects At Risk |
| `colExecRevRisk` | CEO Revenue At Risk |
| `colExecProposals` | CEO Proposals Awaiting Decision |
| `colExecReferrals` | CEO Referral Pipeline |
| `colExecMyTasks` | CEO My Critical Tasks ∩ (Owner or Approver = User().Email) |

## Layout — Desktop

### Header
- Brand: **HVCG OS** / Executive Command  
- Period toggle: Cash MTD | YTD (`varCashPeriod`)  
- Refresh: `Refresh` on all exec collections  
- Role gate banner if `!nfIsOwner`: hide finance tiles

### Row A — North-star KPI strip (`cmpExecKpiTile` × 8)

| Tile | Binding |
|------|---------|
| Pipeline $ | `nfExecPipelineWeighted` |
| MRR | `nfExecMRR` |
| Retainers past due $ | `nfExecRetainerPastDue` |
| Forecast weighted | `nfExecForecastWeighted` |
| Cash collected | `nfExecCashCollected` |
| Outstanding AR | `nfExecOutstandingAR` |
| Capital pipeline $ | `nfExecCapitalPipeline` |
| Projects R/Y | `nfExecProjectsAtRiskCount` |

Tap → opens matching gallery filter or Power BI page.

### Row B — Operating pulse
- Utilization: avg `CurrentUtilizationPct` from capacity snapshot  
- Available hours: sum `AvailableHoursThisWeek`  
- Health distribution: `cmpExecHealthStrip` ← `nfExecClientHealthGreen/Yellow/Red` (ATLAS-M-006)  
- Conversion 90d: `nfExecConversionRate90d` (ATLAS-M-003) — BI preferred for trend  
- Optional BI embed stub for sales cycle (KPI-13)

### Row B2 — Analytics signals (`cmpExecOpsSignalRow`)
| Chip | Binding | Catalog |
|------|---------|---------|
| Overdue task rate | `nfExecOverdueTaskRate` | ATLAS-M-008 |
| Doc completion (crit) | `nfExecDocCompletionCritical` | ATLAS-M-012 |
| Capital readiness | `nfExecCapitalReadiness` | ATLAS-M-011 |
| EV progress | `nfExecEVProgress` | ATLAS-M-014 |
| Active users 7d | `nfExecActiveUsers7d` | ATLAS-M-015 |
| Workflow failures 7d | `nfExecWorkflowFailures7d` | ATLAS-M-016 |

Footer on strip: `cmpExecMetricMeta` with `nfExecSourceMeta`.

### Row B3 — Concentration (Owner/Finance)
- `cmpExecConcentrationBar` ← Top 5 Active MRR clients + `nfExecConcentrationTop3` (ATLAS-M-005)

### Row B4 — Revenue trend (optional BI / spark)
- `cmpExecTrendSpark` or Power BI embed for ATLAS-M-001 — **no fabricated history**

### Row C — My work (`cmpExecQueueCard` galleries)
1. Critical decisions  
2. Approvals waiting  
3. Major risks  
4. My critical tasks  
5. Upcoming meetings (14d)

Each row shows ClientCode, Title, deadline/due, severity chip.

### Row D — Capital & relationships
- Capital by FundingStatus (grouped gallery or chart)  
- Referral pipeline  
- Proposals awaiting decision  
- Revenue at risk $

## Layout — Phone

1. KPI horizontal scroll (4 visible)  
2. My work gallery (Decisions first)  
3. Attention clients  
4. Capital / AR collapsed sections  

See `src/power-apps/executive/layout-phone.md`.

## Explicit exclusions

| Never show | Reason |
|------------|--------|
| HVCG_AI_DraftEmails / unapproved AI outputs | Noise + governance |
| DocumentRequests routine overdue | Ops hub |
| Low-priority Tasks (Medium/Low) unless RequiresExecutiveAttention | US-05 |
| Full contractor lists | Role gate |

## Navigation deep links

| From | To screen | Param |
|------|-----------|-------|
| Client row | scrClientDetail | ClientCode |
| Opportunity | scrOpportunityDetail | OpportunityId |
| Capital | scrCapital | CapitalOpportunityId |
| Decision / Risk | Detail or edit form | ListItemId |
| Invoice / AR | Finance detail (or Ops) | InvoiceId |

## Accessibility / UX

- Currency tiles: no cents; empty → "—" via `nfExecCurrencyOrBlank`  
- Color: `nfHealthColor` / Red-Yellow-Green only for health & risk  
- No card chrome beyond interactive galleries  

## Acceptance (Maker)

1. Owner sees all 8 KPI tiles with non-dummy bindings.  
2. Non-Owner: finance tiles hidden or blanked.  
3. Decision gallery only rows with RequiresExecutiveAttention + open status.  
4. No AI draft list on this screen.  
5. Phone layout reaches My work without horizontal page overflow of galleries.

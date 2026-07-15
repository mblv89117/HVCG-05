# Finance Operations — Architecture

**Module:** Finance Operations  
**Product:** HVCG OS Command Center  
**Branch:** `cursor/finance-operations`  
**Worktree:** `.worktrees/finance-operations`  
**Packaging:** **Option A — exclusive** paths (`docs/finance/`, `src/power-apps/finance/`, exclusive `HVCG_Finance*` list stubs, `tests/finance/`, `tests/unit/test_finance_operations.py`). Shared indexes and existing non-exclusive list schemas are **read-only** on this branch.  
**Audience:** Owner / Finance viewers / Ops Manager (fee fields)  
**Status:** Spec + exclusive stubs + screen package (**IN PROGRESS** — no tenant deploy from this branch)

## 1. Purpose

Provide operational finance (not GL) for HVCG:

- Fee / retainer / success-fee **milestones**
- **Invoices** and collections follow-up
- Client / engagement **budgets** and discretionary spend
- **Expense approvals**
- Pipeline / commit **revenue forecast lines** (feeds Executive KPIs)

External accounting (QuickBooks, etc.) remains outside the system of record. `ExternalAccountingId` on invoices is a future bridge key only.

## 2. Capability map

```
+--------------------------------------------------------------+
|                    Finance Operations                        |
|  Milestones · Invoices · Collections · Budgets · Expenses    |
|  Forecast lines · (future) scrFinance · past-due automation  |
+----------------------------+---------------------------------+
                             |
     +-----------+-----------+-----------+-----------+
     v           v           v           v           v
  Clients     Engagements  Opportunities Capital   Executive
  (lookup)    (lookup)     (forecast)    (forecast) (MRR/AR KPIs)
     +-----------+-----------+-----------+-----------+
                             |
                             v
              SharePoint Lists (system of record)
```

## 3. Layering

| Layer | Technology | Role |
|-------|------------|------|
| SOR | SharePoint Lists `HVCG_*` (Finance domain) | Operational source of truth |
| Cross-domain reads | Clients, Engagements, Opportunities, CapitalOpportunities | Anchors + forecast inputs |
| Ops-adjacent | Subscriptions, RecurringExpenses | Cost visibility (owned by Ops Hub domain; Finance may surface summaries later) |
| App UX (future) | Canvas `scrFinance` (screen map exists in `src/power-apps/README.md`) | Daily AR / milestone work |
| Escalation | Collections `RequiresExecutiveAttention` + milestone past-due flags | Executive queue / digests |
| External | QuickBooks / GL | Not in V1 SOR |

## 4. Design principles

1. **Operational finance ≠ GL** — Track what is owed, collected, and at risk; do not replace bookkeeping.  
2. **Single currency identity** — Prefer `ClientCode` + list lookups; never invent missing amounts.  
3. **Role gate** — Invoice amounts, retainers, and expense totals visible only to Owner / Admin / Ops Manager / finance viewers (`nfIsFinanceViewer` pattern).  
4. **No parallel Finance SOR** — Use existing Finance lists; do not invent `HVCG_Finance*` duplicates unless a true gap appears and Master PM approves.  
5. **Exclusive packaging** — This branch only adds `docs/finance/` + finance offline tests. Shared `_index.json`, `NamedFormulas.fx`, `command-center-views.json`, CRM/deployment engines stay untouched.

## 5. Domain lists (existing — read-only here)

| List | Domain | Primary use |
|------|--------|-------------|
| `HVCG_FinancialMilestones` | Finance (implicit) | Fee schedule, past-due / revenue-at-risk flags |
| `HVCG_Invoices` | Finance | Sent invoices and collection balance |
| `HVCG_CollectionsActivities` | Finance | Reminder / call / escalation log |
| `HVCG_Budgets` | Finance | Approved vs used budget |
| `HVCG_ExpenseApprovals` | Finance | Spend requests + approval status |
| `HVCG_RevenueForecastLines` | Finance | Monthly forecast by pipeline category |

### Exclusive net-new stubs (pending parent index append)

| List | Primary use |
|------|-------------|
| `HVCG_FinanceARSnapshots` | AR aging snapshots |
| `HVCG_FinanceCashReceipts` | Cash / payment applications |
| `HVCG_FinancePaymentPlans` | Structured collection plans |

Related **Ops** lists (not owned by this module): `HVCG_Subscriptions`, `HVCG_RecurringExpenses`.  
Related **Capital** list (not owned): `HVCG_FundingMilestones`.

## 6. Runtime topology (Dev — future apply)

| Surface | Dev target |
|---------|------------|
| SharePoint | `https://highvaluecapitalgroup.sharepoint.com/sites/HVCG-CommandCenter-Dev` |
| Power Apps | `HVCG_ProjectCommandCenter_DEV` → screen `scrFinance` (Maker rebuild later) |
| Flows | Past-due nightly / renewal windows (scaffold later; Off until owner gate) |
| Executive | Reads AR / MRR / forecast; does not own Finance migrations |

## 7. Integration boundaries

| May read | Must not modify (this branch) |
|----------|-------------------------------|
| Existing Finance list schemas | `deployment/**` engines |
| Clients / Engagements lookups | Auth / PnP / `.env*` |
| Executive KPI contracts (AR, MRR) | CRM flows / Maker OA packages |
| TEST_PLAN finance cases TC-F01/F02 | Shared `lists/_index.json`, `flows/_index.json`, `NamedFormulas.fx`, `command-center-views.json` |
| | Production |

Shared merge recommendations: `SHARED_FILE_RECOMMENDATIONS.md`.

## 8. Related requirements

- Root `REQUIREMENTS.md` § FR-FIN  
- Module `docs/finance/REQUIREMENTS.md`  
- Data details: `DATA_MAP.md`

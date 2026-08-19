# FINANCIAL_ACCOUNT_REGISTER

**As of:** 2026-07-15 18:10 PT  
**Rule:** Registry / classification only — **do not** connect accounts, move money, refund, or import live without owner **BL-F1**.  
**Default:** BL-F1 = **Deny**.

---

## Register (inventory)

| Account ID | Platform | Entity | Purpose | Current/Historical | Operating/Processor | Clients linked | Revenue streams | Reconciliation | Import available | Risks | Owner action |
|------------|----------|--------|---------|--------------------|---------------------|----------------|-----------------|----------------|------------------|-------|--------------|
| FA-MERCURY | Mercury | TBD (HVS and/or HVCG) | Operating | Unknown | Operating | TBD | TBD | Unknown | Unknown | Mis-entity attribution | Confirm entity ownership; approve connect later |
| FA-SQUARE | Square | TBD | Payments processor | Unknown | Processor | TBD | TBD | Unknown | Unknown | Payout timing vs invoices | Inventory only |
| FA-CASHAPP | Cash App | TBD | Payments / informal | Unknown | Processor/personal mix risk | TBD | TBD | Unknown | Unknown | Comingling risk | Classify; no auto-import |
| FA-FOUND | Found.com | Historical | Historical activity | Historical | TBD | TBD | TBD | Unknown | Unknown | Legacy completeness | Archive inventory |

---

## Classification questionnaire (complete before any connect)

Answer **per account**. Store answers in this doc (or linked inventory); do not store credentials.

### Shared questions (all platforms)

| ID | Question | Allowed answers | Why it matters |
|----|----------|-----------------|----------------|
| C0.1 | Legal entity on the account (HVS, HVCG, personal, other, unknown)? | enum | Prevents mis-entity P&L |
| C0.2 | Is this account **current** (active) or **historical** (closed/archived)? | current / historical / unknown | Import priority |
| C0.3 | Primary purpose? | operating / payroll / tax / client trust / processor settlement / personal / mixed / unknown | Reporting buckets |
| C0.4 | Operating bank vs payments **processor** vs hybrid? | operating / processor / hybrid / unknown | Revenue recognition timing |
| C0.5 | Any **client funds** or trust-like balances held here? | Y / N / unknown | Compliance / segregation |
| C0.6 | Known linked clients (names only; no account numbers)? | list / none / unknown | Client-level revenue |
| C0.7 | Revenue streams landing here (retainers, project, success fees, reimbursables, other)? | multi | MRR vs fee analytics |
| C0.8 | Reconciliation owner & cadence today? | text / none | Close process |
| C0.9 | Statement / CSV / API export available without live OAuth connect? | Y / N / unknown | Prefer file import later |
| C0.10 | Owner approves live connection (BL-F1)? | **N default** / Y with date | Gate |

### FA-MERCURY (Mercury)

| ID | Question | Notes |
|----|----------|-------|
| CM.1 | Which legal entity owns the Mercury login / EIN on statements? | HVS vs HVCG split is the #1 risk |
| CM.2 | How many Mercury accounts/subaccounts (checking, savings, credit)? | List nicknames only |
| CM.3 | Is Mercury the primary **operating** account for day-to-day payables? | Y/N/unknown |
| CM.4 | Do Square / Cash App / other processors **payout into** Mercury? | Map settlement path |
| CM.5 | Any client-specific virtual accounts or payment links? | Y/N/unknown |
| CM.6 | Historical Mercury activity pre-HVCG brand — keep under which entity books? | Owner call |
| CM.7 | Connect / bank-feed desired later? | **No until BL-F1** |

**Classification checklist:** Entity ____ · Current/Historical ____ · Operating/Processor ____ · Payout destination for processors ____ · Clients linked ____ · Ready for connect? **No**

### FA-SQUARE (Square)

| ID | Question | Notes |
|----|----------|-------|
| CS.1 | Square used for which businesses / locations? | May span clients or only HVCG/HVS services |
| CS.2 | Account type: seller payments, invoicing, payroll, other? | |
| CS.3 | Payout destination bank (Mercury / other / unknown)? | Tie to FA-MERCURY |
| CS.4 | Gross sales vs fees vs refunds — are these **HVCG/HVS revenue** or **client** revenue processed as favor? | Critical misattribution risk |
| CS.5 | Are invoices in Square duplicated in another system? | Double-count risk |
| CS.6 | Historical vs current merchant activity dates? | |
| CS.7 | Live Square Dashboard connect needed? | **No until BL-F1**; prefer export |

**Classification checklist:** Entity ____ · Processor (Y) · Payout bank ____ · Own revenue vs client-processed ____ · Ready for connect? **No**

### FA-CASHAPP (Cash App)

| ID | Question | Notes |
|----|----------|-------|
| CC.1 | Business Cash App vs personal Cash App vs unknown? | Comingling flag |
| CC.2 | Legal name / cashtag associated (no secrets)? | Inventory only |
| CC.3 | Used for client collections, vendor pays, owner draws, or mixed? | |
| CC.4 | Settles to Mercury / bank / spends in-app? | |
| CC.5 | Any balances that may be client money? | Default treat as high risk |
| CC.6 | Should this ever auto-import into books? | Recommendation: **manual only** even after BL-F1 |
| CC.7 | Historical messages/payments to preserve offline? | Export policy TBD |

**Classification checklist:** Business/Personal/Mixed ____ · Operating/Processor ____ · Comingling risk **High/Med/Low** · Ready for connect? **No** (manual classify first)

### FA-FOUND (Found.com)

| ID | Question | Notes |
|----|----------|-------|
| CF.1 | Confirm Found is **historical** (no new activity expected)? | Default assumption |
| CF.2 | Entity that used Found (HVS / personal / other)? | |
| CF.3 | Date range of activity (approx)? | |
| CF.4 | Purpose while active (operating, tax, contractor, unknown)? | |
| CF.5 | Are closing statements / CSV already exported? | Prefer archive file over reconnect |
| CF.6 | Any open balance or pending tax estimate in Found? | |
| CF.7 | Reconnect Found API/account? | **Not recommended**; archive inventory only unless owner insists + BL-F1 |

**Classification checklist:** Historical **Y/N** · Entity ____ · Archive export exists ____ · Reconnect needed? **No (default)**

---

## Classification status

| Account ID | Questionnaire complete? | Provisional class | Blockers |
|------------|-------------------------|-------------------|----------|
| FA-MERCURY | No | Operating bank; entity TBD | Owner entity confirmation |
| FA-SQUARE | No | Processor; payout path TBD | Own vs client revenue |
| FA-CASHAPP | No | Mixed-risk processor/personal | Comingling review |
| FA-FOUND | No | Historical archive | Export location unknown |

---

## Reporting targets (build after classification)

Revenue by entity · by client · by service · MRR · AR · collections · retainers · success fees · reimbursables · client spending accounts · deposits · unapplied payments.

**Import rule:** file-based / manual classification first; live OAuth or bank connect only after BL-F1 and completed questionnaire rows above.

## Related inventory (no account connects)

- Invoice register / AR snapshot: `.worktrees/finance-operations/docs/finance/inventory/`
- Pricing engine status: `docs/finance/pricing/ENGINE_STATUS.md` (finance WT)

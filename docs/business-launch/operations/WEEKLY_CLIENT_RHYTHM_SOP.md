# WEEKLY_CLIENT_RHYTHM_SOP

**Division:** Operations  
**As of:** 2026-07-16  
**Scope:** Green-band legacy clients — ACCG, Prodigy, Christie, Frocovery  
**Env:** Internal ops only · **Prod:** Forbidden  
**Status:** ACTIVE — COO executes autonomously  

---

## Purpose

Run a predictable **internal** weekly rhythm for the four highest-trust legacy clients so delivery stays visible, AR risk is surfaced early, and CEO interrupts happen only when money can be collected or judgment is required — **without** repricing, **without** automated client contact, and **without** waiting for direction.

---

## Standing locks (non-negotiable)

| Lock | Rule |
|------|------|
| **Pricing** | Preserve invoice-verified / contracted rates. See `../finance/LEGACY_PRICING_GUARD.md`. No rate-card application, no uplift drafts, no CRM amount overwrites. |
| **Client contact** | **No auto client messages.** Email, SMS, portal notify, and Teams-to-client are forbidden until **BL-C1** / per-message owner approval. Internal drafts and queues only. |
| **Production** | Dev stubs, read-only Hub pulls, and doc updates only. No Power Automate Prod deploy, no portal invites, no public publish. |
| **CEO interrupt** | Escalate only per `COO_OPERATING_CHARTER.md`: money collectible, CEO judgment, signature, legal, Prod, unsolvable blocker. |

---

## Client roster (weekly coverage)

| Client | Code | Health | Locked pricing | Collections priority | Renewal (internal) |
|--------|------|--------|----------------|----------------------|---------------------|
| ACCG Inc. | `ACCG01` | Green | **$4,539/mo** `OWNER_LOCKED` | MEDIUM — past-due history on file | Oct 2026 |
| Prodigy Games LLC | `PROD01` | Green | ~**$7,500/mo** `LEGACY_BLOCK` | **HIGH** — Apr/May past-due signals | Aug 2026 |
| Christie's Place LLC | `CHRI01` | Yellow *(service tier: Green-band rhythm)* | **$4,750** invoice pattern `LEGACY_BLOCK` | LOW — monitor unless AR > 0 | Sep 2026 |
| Frocovery LLC | `FROC01` | Green | Tiered BDA ($500–$2,500/mo band) `PRESERVE` | LOW — confirm tier if invoice ambiguous | Oct 2026 |

**Related:** `../clients/RENEWAL_CALENDAR_2026H2.md` · `../PRICING_REGISTER.md` · `../capital/CAPITAL_OPPORTUNITY_REGISTER.md`

---

## Weekly calendar (COO / Operations)

All steps are **internal**. Client-facing output requires owner approval and is out of scope for this SOP.

### Monday — Snapshot & triage (≤45 min)

| # | Action | Owner | Output |
|---|--------|-------|--------|
| M1 | Refresh AR view from `../finance/AR_DASHBOARD.md` (or run `../finance/refresh_ar_weekly.py` read-only) | Ops | Updated aging notes per client code |
| M2 | Reconcile Green-band roster vs Executive Brief health counts | Ops | Flag if band changed (do not reclassify without evidence) |
| M3 | Collections queue hygiene — `../finance/APPROVAL_QUEUE.md` | Ops | QueueIds current; **PENDING_OWNER** unchanged until Manny acts |
| M4 | Open Hub read-only check per client — last invoice PDF, active folder activity | Ops | `MISSING` list for deliverables |
| M5 | Enqueue internal tasks only (SharePoint Dev / task list) — **no client email** | Ops | Task IDs logged in weekly rollup |

**Prodigy / ACCG:** If past-due > 0, ensure collections pack evidence is linked (`../finance/COLLECTIONS_PACK.md`). Do **not** send reminders.

### Tuesday — Delivery & workspace (≤60 min)

| # | Action | Notes |
|---|--------|-------|
| T1 | Per-client open deliverable scan (Hub `4_Engagements/00_Client Files/{Client}/`) | Read-only |
| T2 | Age internal tasks **>7d** — reassign or close with note | KPI: open tasks aged >7d ↓ |
| T3 | Capital register touch — ACCG + Frocovery active paths; Prodigy monitor | `../capital/CAPITAL_OPPORTUNITY_REGISTER.md` |
| T4 | CRM Dev shell readiness (no import without checklist) | `../crm-import/DEV_CRM_IMPORT_CHECKLIST.md` |

### Wednesday — Client Success handoff (≤30 min)

| # | Action | Notes |
|---|--------|-------|
| W1 | Renewal horizon check — any client inside **90 days** of internal review date | Update calendar row notes only |
| W2 | QBR / check-in prep **internal** one-pagers where scheduled | ACCG template: `../clients/ACCG01/QBR_ONE_PAGER.md` |
| W3 | Portal prep flag only — `PortalEnabled=false`, no invites | Client Success owns portal plans |

### Thursday — Finance sync (≤30 min)

| # | Action | Notes |
|---|--------|-------|
| Th1 | Verify pricing locks still honored in any new drafts (collections, proposals) | ACCG must show `$4,539` in copy if drafted |
| Th2 | Invoice register spot-check — new filenames since Monday | No invented balances |
| Th3 | If owner approved a collections send, log outcome to CRM Dev note | Human send only post-approval |

### Friday — Rollup & next-week queue (≤30 min)

| # | Action | Output |
|---|--------|--------|
| F1 | Publish **internal** weekly client rhythm rollup (4-row status table) | Paste into next `EXECUTIVE_BRIEF.md` assembly inputs |
| F2 | Record blockers — Graph, PnP, BL-C1, etc. | No CEO ping unless interrupt class |
| F3 | Generate next highest-EV Operations task | See end of doc |

---

## Per-client weekly minimum (internal)

### ACCG (`ACCG01`)

- Confirm **$4,539/mo** unchanged in all systems and draft copy.
- Pull last 3 invoices + open projects list (read-only) when QBR prep is active.
- Capital / bonding file status note — no new pricing in capital decks.
- Past-due: queue only; owner decides collect vs call.

### Prodigy (`PROD01`)

- **Collections first** when AR flags > 0 — internal pack complete before any owner decision.
- Confirm ~$7,500/mo preserved; no nurture sequences on AR.
- Monitor strategic capital agreement — internal note only.
- Related: That's Kava (`KAVA01`) via Prodigy agr. — renewal note in calendar, no separate rhythm unless escalated.

### Christie (`CHRI01`)

- Monitor **$4,750** invoice cadence — skip collections draft unless past_due > 0.
- Yellow band: watch for delivery gaps; do not downgrade service rhythm.
- No auto outreach — owner initiates relationship touchpoints.

### Frocovery (`FROC01`)

- Confirm active BDA tier against latest invoice (tiered $500–$2,500/mo band).
- Startup advisory deliverables — Hub folder check.
- Capital path note in register; no success-fee repricing without owner.

---

## Weekly rollup template (internal)

Copy into brief assembly or ops log:

```markdown
## Green-band weekly rhythm — {ISO week}

| Code | AR status | Deliverables | Collections queue | Renewal note | Blocker |
|------|-----------|--------------|-------------------|--------------|---------|
| ACCG01 | | | | Oct 2026 | |
| PROD01 | | | Q-20260715-001 if open | Aug 2026 | |
| CHRI01 | | | Skip if clear | Sep 2026 | |
| FROC01 | | | | Oct 2026 | |

Pricing changes this week: **NONE**
Client messages sent without approval: **NONE**
```

---

## Forbidden actions (weekly)

- Apply HVCG public rate card to any of the four clients.
- Auto-send reminders, QBR invites, portal emails, or nurture sequences.
- Import CRM shells to Prod or set `DoNotContact=false` without BL-C1.
- Present draft MSA/SOW pricing ($12,500 / $6,000 ACCG drafts, etc.) as billable.
- Deploy collections or onboarding flows to Production (**PROD-1** gate).

---

## Handoffs

| Division | When | Artifact |
|----------|------|----------|
| **Finance** | Past-due detected / queue stale | `APPROVAL_QUEUE.md`, `COLLECTIONS_PACK.md` |
| **Client Success** | Renewal inside 90d / QBR due | `RENEWAL_CALENDAR_2026H2.md`, QBR one-pagers |
| **Capital Advisory** | Funding status change | `CAPITAL_OPPORTUNITY_REGISTER.md` |
| **Product Development** | CRM import ready post-checklist | `DEV_CRM_IMPORT_CHECKLIST.md` |
| **Executive Office** | Interrupt class only | `EXECUTIVE_BRIEF.md` |

---

## KPIs (Operations)

| KPI | Target |
|-----|--------|
| Weekly rhythm completed (4/4 clients) | 100% |
| Open internal tasks aged >7d | Trend down |
| Pricing lock violations | **0** |
| Unauthorized client sends | **0** |
| Onboarding pack cycle time (when triggered) | Track; legacy excluded from auto-onboard |

---

## Related documents

- `../finance/LEGACY_PRICING_GUARD.md`
- `../finance/COLLECTIONS_AUTOMATION.md`
- `../finance/APPROVAL_QUEUE.md`
- `../clients/RENEWAL_CALENDAR_2026H2.md`
- `../crm-import/DEV_CRM_IMPORT_CHECKLIST.md`
- `../onboarding/AUTOMATED_ONBOARDING_SPEC.md` *(HVCG new clients only — not legacy)*
- `../divisions/operations/README.md`

---

## Next task generated

**Doc request templates** for Green-band legacy clients — internal Hub pull checklists per client (ACCG, Prodigy, Christie, Frocovery): invoices, agreements, open deliverables, capital files. No client email, no Prod, no pricing fields.

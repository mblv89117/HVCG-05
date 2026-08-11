# Revenue Operating System — User Guide

**Surface:** Atlas Elite OS (`/revenue`, Executive Home)  
**Audience:** Owner, Executive, Advisor, Operations, Finance  
**Rule:** Fee, recurring, and success-fee amounts display only when verified. Until then the UI shows **Pending verification**.

## What this system covers

Lifecycle from referral/lead through engagement closeout:

New Lead → Qualified → Discovery → Assessment → Blueprint → Proposal → Negotiation → Won → Onboarding → Active Engagement → Closed / Lost

## Getting started

1. Open **Executive Home** for revenue strip (open count, weighted forecast label, stale alerts, Blueprint in flight).
2. Open **Revenue** for the production pipeline, leads, opportunities, and referral partners.
3. Open an opportunity (e.g. Colorado Craft Beef) for full detail and actions.

## Leads

| Action | Who | Notes |
|--------|-----|--------|
| Create lead | Owner, Executive, Advisor | Starts as **New** — never auto-qualified |
| Qualify | Owner, Executive, Advisor | Manual only |
| Convert | Owner, Executive | Creates opportunity; referral attribution is preserved |

## Opportunities

On the detail page you can:

- Update stage
- Record activities
- Schedule follow-ups
- Generate tasks (from next action, Blueprint, proposal, open documents)
- Prepare Blueprint engagement
- Track proposal status
- Mark Won or Lost
- Initiate onboarding (from Won / Onboarding)

## Referral tracking

Partners maintained in the catalog:

- **Generational Group**
- **Randy Kamin** (Generational Group advisor)

Attribution is stored on the opportunity (`referralSource`, `referralPartnerId`, `attributionChain`) from initial referral through close.

## Colorado Craft Beef (current seed)

| Field | Value |
|-------|--------|
| Organization | Colorado Craft Beef (`CCB01`) |
| Contact | Jeff Smith |
| Referral | Randy Kamin — Generational Group |
| History | Original HVS referral → current HVCG opportunity |
| Owner | Manny Barela |
| Stage | Blueprint (presentation) |
| Objectives | Growth capital and additional real estate |
| Fees / recurring / success fee | Pending verification (not invented) |

## Forecast & stale alerts

- **Weighted forecast** uses stage probability × estimated fee when fee is known; otherwise **Pending verification**.
- **Stale** = inactive beyond threshold **or** overdue next-action date (open stages only).

## Roles

Canonical release roles (`VITE_ATLAS_ROLE`):

| Role | Revenue |
|------|---------|
| HVCG Owner | Full |
| Administrator | Full + admin |
| HVCG Team Member | Pipeline work (no convert / won-lost / referral admin / forecast $) |
| Read-Only Advisor | View weighted + stale only |
| Client Executive / Client Team Member | No Revenue module (client workspace demo only) |

Legacy aliases (`Owner`, `Executive`, …) still map to canonical roles.

## Related routes

- `/` — Executive Home (revenue widgets)
- `/revenue` — Pipeline
- `/revenue/opportunities/:id` — Opportunity detail
- `/clients/ws-ccb` — Client workspace

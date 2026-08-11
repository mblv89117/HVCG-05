# CR — HVCG BUSINESS ARCHITECTURE V2 INTEGRATION

| Field | Value |
|-------|--------|
| **ID** | `CR-HVCG-BA-V2-001` |
| **Title** | HVCG Business Architecture V2 Integration into Project Atlas |
| **Status** | `OWNER_ACCEPTED / DEVELOPMENT_AUTHORIZED` |
| **Opened** | 2026-08-11 |
| **Owner accepted** | 2026-08-11 — [ADR-BA-V2-002](../Decisions/ADR-BA-V2-002-owner-decisions-2026-08-11.md) |
| **Requester** | Owner (Manny) — authorized Change Request via master prompt |
| **Primary owner** | Master PM / Systems Architect (this workstream) |
| **Branch** | `cursor/hvcg-business-architecture-v2` |
| **Worktree** | `.worktrees/hvcg-business-architecture-v2` |
| **Base HEAD** | `fb38e42` (`cursor/agent-communications` tip at branch cut) |
| **Production impact** | **NONE authorized** by this CR |
| **Related docs** | [HVCG_BUSINESS_ARCHITECTURE_V2.md](../BUSINESS/HVCG_BUSINESS_ARCHITECTURE_V2.md) · [Impact Analysis](../Reports/HVCG_V2_IMPACT_ANALYSIS_2026-08-11.md) |

---

## 1. Business reason

High Value Capital Group is evolving into a premium capital, strategic finance, growth, risk-reduction, and AI operating partner for founder-led companies. Atlas must operationalize a consistent service taxonomy, offer catalog, versioned pricing, legacy-price protection, client migration, and domain extensions (Capital, CFO, Procurement, Risk, Growth, AI, Referrals) **inside** Project Atlas — not as a competing OS.

## 2. Owner request

Owner-authorized evaluation and Development integration of HVCG Business Architecture V2 into Atlas Elite / Revenue OS / Integration Hub / SharePoint schemas, subject to existing Atlas approval gates.

**Explicitly NOT authorized by this CR:** Production schema mutation, Production data migration, existing-client price changes, outbound client email/SMS/Teams, external proposals/lender submissions, payment transactions, public website/DNS, deletion of legacy HVS data, rewriting protected release tags.

## 3. Scope

### In scope (Development / documentation)

1. Canonical business architecture document (V2)
2. Service Line model (7 lines)
3. Offer catalog (13 offers) as configuration SoR
4. Pricing version architecture + current-vs-proposed-vs-recommended separation
5. Opportunity commercial classification (Structured / Retainer / Premium Special)
6. Client migration model + seed records (UNKNOWN where unverified)
7. Schema impact matrix and Dev-only list definitions
8. Elite navigation / Client 360 / Revenue OS extension plans (no competing shells)
9. Mapping of Capital / CFO / Procurement / Risk / Growth / AI / Referral domains onto existing Atlas modules
10. Sprint plan + tests for foundation taxonomy/pricing locks

### Out of scope (until separate CR / owner gate)

- Production deploy or Production SharePoint/Dataverse writes
- Automatic repricing of any legacy client (including ACCG)
- Enabling BL-C1 outbound communications
- Merging into Elite Production SWA without release gates
- Replacing Next.js/Postgres greenfield stack proposals
- Creating Capital/CFO/Procurement/Risk/AI standalone SPAs

## 4. Existing modules affected

| Module | Impact | Mode |
|--------|--------|------|
| Revenue OS (Track 2) | Extend opportunity → offer → pricing → proposal | Extend |
| PRICING_REGISTER / BL-P1 | New **proposed** rate card V2 alongside locked v1 | Version; do not silently replace |
| Elite OS navigation | Add Offers / Service Catalog / Migration / domain IA | Extend |
| Client 360 | Add Revenue / Capital / Procurement / Risk / Migration sections | Extend |
| Capital lists + `/capital` | Capital Case / readiness engine | Extend |
| Finance Ops / FI / QBO / Plaid | Fractional CFO layer on existing finance surfaces | Extend / integrate |
| AI Governance | Map 18 agents onto existing registry/queues | Extend |
| Referrals lists | Referral Partner Engine economics + approvals | Extend |
| Document Requests + folder taxonomy | Map V2 folder categories; preserve legacy paths | Extend / map |
| Integration Hub | Future APIs for catalog/pricing/migration | Plan → extend |
| Track 1 Production CRM | **No change** under this CR | Protect |

## 5. New domains

| Domain | Classification |
|--------|----------------|
| Service Lines | New configuration + Dev list |
| Offers | New configuration + Dev list |
| Pricing Versions / Price States | New configuration + Dev list |
| Client Migrations | New model + Dev list (docs exist; operationalize) |
| Procurement Opportunities / Contractor Profiles | New (missing today) |
| Risk & Claims Matters | New (HVCG_Risks is ops risk, not claims) |
| Executive Owner Support (restricted) | New classification + permission boundary |
| Opportunity Commercial Class | Extension field on Opportunities |

## 6. Data / schema impact

See Impact Analysis § Data Model Plan. Dev-only additive list schemas proposed:

- `HVCG_ServiceLines`
- `HVCG_Offers`
- `HVCG_PricingVersions`
- `HVCG_ClientMigrations`
- (later tracks) `HVCG_ProcurementOpportunities`, `HVCG_ContractorProfiles`, `HVCG_RiskMatters`

**Rule:** additive / idempotent migrations only. No destructive column renames in Production. No overwrite of contracted pricing fields.

## 7. UI impact

Elite OS only. Extend AppShell IA. Reuse Client 360, Revenue, Capital, Approvals, AI Agents routes. Admin: Service Catalog + Pricing versions. No new competing shell.

## 8. Revenue impact

- New-client rate card V2 is **PROPOSED** until owner supersedes `BL-P1` / `HVCG-PRICE-2026-07-15-v1`
- Legacy contracted prices remain authoritative (`BL-ACCG-PRICE` and Section A)
- Distinguishes Contracted / Historical / Rate Card / Recommended / Proposed / Approved Future / Effective

## 9. AI impact

Extend existing AI Governance (agents, prompts, approvals, work queues). Configure 18 HVCG agents as registry metadata. Preserve absolute prohibitions on autonomous external commitments. No second AI governance system.

## 10. Microsoft impact

Reuse Entra, Graph, SharePoint, Power Automate, Dataverse solution packaging. Prefer Integration Hub adapters. No new M365 product stack.

## 11. Security impact

- Restricted service line: Executive Owner Support
- Client isolation preserved
- AI source-permission parity
- External-contact locks remain Off
- UI hiding ≠ authorization

## 12. Client impact

- Documentation / migration records only in Sprint 1 foundation
- No client-facing price change
- No outbound contact
- Legacy HVS records preserved

## 13. Migration impact

Map named relationships (ACCG, Prodigy, That’s Kava, Christie’s Place, Lien Partners, Final Installment, Nabro Holdings, Jay’s Landscaping, Randy / Generational) with **UNKNOWN / REQUIRES VERIFICATION** when facts missing. Confirm vs invent. Separate Confirmed vs Proposed revenue.

## 14. Production impact

**None.** Production Absolute GO (`atlas-v1.0.1-production`) and Track 1 freeze remain protected. This CR does not authorize Production deploy.

## 15. Risks

| Risk | Mitigation |
|------|------------|
| Stale root Atlas SoR vs Absolute GO | Document discrepancy; update CURRENT_STATE in this branch |
| Dual rate cards (v1 locked vs v2 proposed) | Explicit versioning + owner gate to activate V2 |
| Duplicate CRM / pricing / AI systems | Consolidation rules in Impact Analysis |
| Forking Elite / track10 divergence | Work only on dedicated BA-V2 branch; integrate via Elite adapters later |
| Accidental legacy reprice | Tests + PRESERVE locks + no auto-apply |
| Competing shells | Explicit ban; integrate into Elite |

## 16. Dependencies

- Existing Revenue OS tips (`0073bf4`, `bf34c93`) for conversion patterns
- `PRICING_REGISTER.md` / `OWNER_DECISIONS.md` (worktree commercial SoR)
- Elite OS / Integration Hub lineage (`atlas-v1.0.1-production` + usable-operating-layer)
- AI Governance schemas / SPA (deferred packages)
- Owner approval to activate V2 rate card as current selling card

## 17. Testing

- Service classification
- Offer selection from config (not UI hardcode)
- Pricing version selection
- Legacy price protection (ACCG $4,539 never overwritten by V2 ranges)
- Revenue classification separation
- Client migration seed integrity (no fabricated dollars)
- Permission / external-contact lock regression (documentation + future API tests)

## 18. Rollback

- Branch/worktree isolated — delete branch or revert commits
- Config/schema files additive — remove Dev lists if provisioned in Dev only
- No Production artifacts created by foundation sprint
- Do not touch tags `atlas-v1.0.0-production` / `atlas-v1.0.1-production`

## 19. Documentation

Update / create:

- This CR
- `PROJECT_ATLAS/BUSINESS/HVCG_BUSINESS_ARCHITECTURE_V2.md`
- Impact Analysis report
- `CURRENT_STATE.md` (discrepancy + CR pointer)
- `DECISIONS.md` (conflicts / proposed reconciliations)
- `CHANGELOG.md`, `NEXT_ACTIONS.md`, `ROADMAP.md` (pointers)
- Config under `config/business/`

## 20. Suggested track / sprint sequence

| Track | Name | Notes |
|-------|------|-------|
| **BA-A** | Business Catalog Foundation | Sprint 1 now |
| **BA-B** | Revenue OS Extension | After catalog |
| **BA-C** | Capital OS | Extend existing Capital |
| **BA-D** | Financial Advisory | Finance Ops/FI/QBO/Plaid |
| **BA-E** | Procurement + Risk | New domains |
| **BA-F** | AI Agent Platform | Extend governance |
| **BA-G** | Client Experience | Client 360 / Portal / Docs |
| **BA-H** | Executive Intelligence | Metrics with sourced dollars |

Reconcile with existing Tracks 1–8; do not duplicate Track numbers casually — use **BA-*** labels under this CR.

## 21. Approval

| Gate | Required? | Status |
|------|-----------|--------|
| Owner accept CR scope | Yes | Pending |
| Activate pricing V2 as current rate card | Yes (supersedes BL-P1) | Pending — V2 remains PROPOSED |
| Production deploy | Separate CR | Not requested |
| BL-C1 / outbound | Separate | Locked Off |
| Existing-client reprice | Separate per client | Locked |

---

**Definition of done for CR acceptance (documentation gate):** Impact Analysis + Business Architecture V2 + foundation config + legacy-lock tests exist on this branch. Implementation of later tracks requires owner sequencing, not a blank check.

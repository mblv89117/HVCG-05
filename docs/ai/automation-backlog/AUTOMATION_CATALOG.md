# AUTOMATION_CATALOG

**Team:** Technology and Automation  
**Owner path:** `ai-governance` → Master PM → Manny  
**As of:** 2026-07-15 18:45 PT  
**Environment:** Dev / draft-only unless owner clears **PROD-1**, **BL-C1** (send), or **BL-F1** (money)

**Rule:** Recommend automation before asking Manny to do it manually.  
**Owner gate:** `Yes` when workflow touches **send**, **money**, or **Prod**. `No` = Dev-only drafts, internal lists, no outbound.

**Systems key:** PA = Power Automate · SP = SharePoint lists · DV = Dataverse Dev CRM · AI = HVCG AI job lists (`HVCG_AI_*`) · Graph = Microsoft Graph (read)

---

## Catalog summary

| Category | IDs | Total est. hrs/wk |
|----------|-----|-------------------|
| Email & comms | A01, A05, A10, A11, A14 | 12.5 |
| Sales & proposals | A02, A15, A16 | 6.5 |
| CRM & intake | A03, A17, A18 | 7.5 |
| Client onboarding & docs | A04, A06, A19 | 8.5 |
| Financial | A07, A20 | 3.5 |
| Capital / lender / investor | A08, A09, A21, A22 | 7.5 |
| Tasks & executive | A12, A13 | 4.0 |
| **Total (22 workflows)** | **A01–A22** | **~50.0** |

---

## A01 — Email triage (inbox → classify → queue)

| Field | Value |
|-------|-------|
| **Trigger** | New message in `inbox@highvaluecapitalgroup.com` (or Manny monitored folders) |
| **Steps today (manual)** | 1) Open Outlook · 2) Skim subject/sender · 3) Guess client/opportunity · 4) Forward or flag · 5) Create ad-hoc CRM note or task · 6) Draft reply in head or Word · 7) Defer unknowns to Manny |
| **Proposed automation** | Graph subscription → PA classifies (client code, urgency, intent: billing/doc/sales/ops) → upsert `HVCG_AI_DraftEmails` + `HVCG_AI_SuggestedActions` → optional CRM activity draft on matched Account/Opportunity · **No send** |
| **Systems** | Outlook/Graph, PA, `HVCG_AI_DraftEmails`, `HVCG_OpportunityActivities`, DV |
| **Hrs/wk saved** | 5.0 |
| **Priority** | **P0** |
| **Owner approval needed?** | **Yes** — Graph creds (**BL-GRAPH-1**); any auto-send (**BL-C1**) |

---

## A02 — Proposal writing (draft DOCX + pricing JSON)

| Field | Value |
|-------|-------|
| **Trigger** | Opportunity `Stage` → `Proposal` OR manual "Generate proposal" on `HVCG_Opportunities` |
| **Steps today (manual)** | 1) Copy Word template · 2) Pull EVA notes from Lead · 3) Look up rate card · 4) Pick SKU manually · 5) Type executive summary · 6) Email draft to owner for price approval · 7) Save to client folder |
| **Proposed automation** | `PRICING_ENGINE_SPEC` + `PROPOSAL_TEMPLATE` → AI/PA generates JSON + DOCX to Dev library `HVCG_Proposals` with `owner_approval_required: true` · populate `HVCG_Proposals` row · **No delivery to prospect** |
| **Systems** | PA, AI (`HVCG_AI_GeneratedDocuments`), `HVCG_Proposals`, `HVCG_Opportunities`, `PRICING_REGISTER` |
| **Hrs/wk saved** | 3.0 |
| **Priority** | **P0** |
| **Owner approval needed?** | **Yes** — price approval always; prospect delivery (**BL-C1**) |

---

## A03 — CRM updates (forms, parse, Dev draft rows)

| Field | Value |
|-------|-------|
| **Trigger** | EVA/FRA form submit (**BL-W1**), referral form, manual ops form, or structured email parse (future) |
| **Steps today (manual)** | 1) Read form notification · 2) Open SharePoint list · 3) Create Lead row by hand · 4) Copy 20+ fields · 5) Compute lead score in spreadsheet · 6) Link opportunity if qualified |
| **Proposed automation** | `EVA_INTAKE_TO_CRM_MAP` → PA idempotent upsert `HVCG_Leads` / `HVCG_Opportunities` · run lead score · `HVCG_LeadQualifiedCreateOpportunity` on threshold · Dev only |
| **Systems** | Microsoft Forms, PA, `HVCG_Leads`, `HVCG_Opportunities`, `PIPELINE_STAGES` |
| **Hrs/wk saved** | 4.0 |
| **Priority** | **P0** |
| **Owner approval needed?** | **No** (Dev writes; no outbound) |

---

## A04 — Client onboarding (Won → shell pack, no invite)

| Field | Value |
|-------|-------|
| **Trigger** | Opportunity `Stage` = `Won` + `Classification` = `HVCG_NEW_CLIENT` |
| **Steps today (manual)** | 1) Create client folder tree · 2) Enter Account/Contact/Engagement in CRM · 3) Pick project template · 4) List document requests · 5) Assign PM tasks · 6) Chase signed agreement hash · 7) Plan workspace (no portal) |
| **Proposed automation** | `AUTOMATED_ONBOARDING_SPEC` orchestration: `HVCG_OpportunityWonCloseout` → Account/Contact/Engagement → `HVCG_CreateProjectFromTemplate` → `HVCG_CreateDocumentRequests` → internal tasks · `PortalEnabled=false` · skip welcome (**BL-C1**) |
| **Systems** | PA (`HVCG_ClientOnboarding`), DV, SP workspace templates, `templates/projects/general-client-onboarding.json` |
| **Hrs/wk saved** | 3.0 |
| **Priority** | **P0** |
| **Owner approval needed?** | **Yes** — portal invite / client email (**BL-C1**); Prod (**PROD-1**); flow import (**D-002**) |

---

## A05 — Meeting scheduling (holds + CRM activity)

| Field | Value |
|-------|-------|
| **Trigger** | Lead score ≥70, Strategy Call stage entry, or "Schedule discovery" task due |
| **Steps today (manual)** | 1) Email back-and-forth for slots · 2) Check Manny/owner calendar · 3) Send invite · 4) Create Teams link · 5) Log `HVCG_Meetings` / Discovery row · 6) Prep brief |
| **Proposed automation** | Microsoft Bookings or Forms "pick a slot" → PA creates calendar **hold** (internal attendees only until BL-C1) → draft `HVCG_Meetings` + `HVCG_DiscoveryCalls` · optional prep brief job · **No external invite until approved** |
| **Systems** | Bookings/Outlook, PA, `HVCG_Meetings`, `HVCG_DiscoveryCalls` |
| **Hrs/wk saved** | 2.0 |
| **Priority** | P1 |
| **Owner approval needed?** | **Yes** — external booking page / client calendar invite (**BL-C1**) |

---

## A06 — Document requests (checklist → chase drafts)

| Field | Value |
|-------|-------|
| **Trigger** | Onboarding step 7, project template doc set, or overdue `HVCG_DocumentRequests` |
| **Steps today (manual)** | 1) Maintain Excel checklist per client · 2) Email client for missing docs · 3) Track uploads in folder · 4) Update request status · 5) Escalate stale items to Manny |
| **Proposed automation** | `HVCG_CreateDocumentRequests` from template + EVA Q17 gaps → nightly PA scans folder vs checklist → update status → queue **draft** reminders in `HVCG_AI_DraftEmails` / `document-reminder.md` template · **No client notify** until BL-C1 |
| **Systems** | PA, SP client libraries, `HVCG_DocumentRequests`, Portal (staging), AI drafts |
| **Hrs/wk saved** | 3.0 |
| **Priority** | P1 |
| **Owner approval needed?** | **Yes** — client reminder send (**BL-C1**) |

---

## A07 — Financial reporting (AR snapshot + register roll-up)

| Field | Value |
|-------|-------|
| **Trigger** | Weekly schedule (Monday 06:00 PT) or invoice extract refresh |
| **Steps today (manual)** | 1) Open invoice PDFs / folders · 2) Update spreadsheet register · 3) Sum open AR · 4) Split verified vs unverified MRR · 5) Paste into executive markdown · 6) Reconcile against bank manually |
| **Proposed automation** | PA reads `inventory/pdf_billing_extracts.json` + `HVCG_Invoices` Dev rows → compute `AR_Outstanding`, verified MRR per `COMMAND_CENTER_WIRE_PLAN` → upsert `ExecutiveMetricsSnapshot` · **No bank OAuth** |
| **Systems** | PA, `HVCG_Invoices`, `PRICING_REGISTER`, `ExecutiveMetricsSnapshot`, finance scripts |
| **Hrs/wk saved** | 2.0 |
| **Priority** | **P0** |
| **Owner approval needed?** | **No** (register-only; **BL-F1** blocks live money connect) |

---

## A08 — Capital packages (readiness pack index + QC)

| Field | Value |
|-------|-------|
| **Trigger** | Project template `capital-readiness-assessment` or `debt-capital-raise` phase "Packaging" |
| **Steps today (manual)** | 1) Open client SharePoint library · 2) Walk folder 00–23 checklist · 3) Build binder index Word doc · 4) Flag missing financials · 5) Version package for advisor review |
| **Proposed automation** | PA + AI: scan library metadata → generate package index manifest JSON + PDF/Word index → create QC tasks from `templates/projects/capital-readiness-assessment.json` · store in `HVCG_AI_GeneratedDocuments` |
| **Systems** | SP libraries, PA, project templates, AI doc gen |
| **Hrs/wk saved** | 2.0 |
| **Priority** | P1 |
| **Owner approval needed?** | **No** (internal assembly only) |

---

## A09 — Lender packages (CIM/binder + data-room index)

| Field | Value |
|-------|-------|
| **Trigger** | `lender-package` or `debt-capital-raise` milestone "Package QC passed" |
| **Steps today (manual)** | 1) Apply lender-specific checklist · 2) Assemble financial spreads · 3) Build table of contents · 4) Redact PII manually · 5) Upload to share drive · 6) Email lender (manual) |
| **Proposed automation** | Template-driven assembly: map docs to `lender-package.json` tasks → AI draft CIM sections from CRM + EVA → data-room index in SP · draft outreach row in `HVCG_LenderOutreach` · **No external share/send** |
| **Systems** | PA, `HVCG_Lenders`, `HVCG_LenderOutreach`, SP, `templates/projects/lender-package.json` |
| **Hrs/wk saved** | 2.5 |
| **Priority** | P1 |
| **Owner approval needed?** | **Yes** — external lender share/send (**BL-C1**) |

---

## A10 — Investor updates (digest drafts)

| Field | Value |
|-------|-------|
| **Trigger** | Monthly cadence or `investor-outreach` project milestone |
| **Steps today (manual)** | 1) Pull CRM metrics · 2) Summarize progress per client raise · 3) Draft update email · 4) Owner review · 5) Send BCC to investor list |
| **Proposed automation** | Scheduled PA: aggregate Opportunity/Project milestones → AI narrative draft → `HVCG_AI_DraftEmails` + `HVCG_InvestorOutreach` row · attach deck stub from `investor-presentation.json` outline · **No send** |
| **Systems** | PA, AI, `HVCG_Investors`, `HVCG_InvestorOutreach`, Outlook drafts |
| **Hrs/wk saved** | 1.0 |
| **Priority** | P2 |
| **Owner approval needed?** | **Yes** — investor send (**BL-C1**) |

---

## A11 — Follow-up sequences (stage-based draft cadence)

| Field | Value |
|-------|-------|
| **Trigger** | Opportunity stage idle N days (Proposal=3, Negotiation=5, Discovery=7) or Lead nurture band |
| **Steps today (manual)** | 1) Review pipeline spreadsheet · 2) Remember who to ping · 3) Write follow-up email · 4) Log activity · 5) Snooze mentally |
| **Proposed automation** | PA daily scan open Opportunities/Leads → enqueue draft sequence in `HVCG_AI_DraftEmails` per `PIPELINE_STAGES` rules · create `HVCG_OpportunityActivities` "Follow-up due" · **No auto-send** |
| **Systems** | PA, CRM, AI drafts, `SALES_PIPELINE_STATUS` |
| **Hrs/wk saved** | 3.0 |
| **Priority** | **P0** |
| **Owner approval needed?** | **Yes** — any outbound send (**BL-C1**) |

---

## A12 — Task management (SLA rules → auto tasks)

| Field | Value |
|-------|-------|
| **Trigger** | Engagement start, project template spawn, milestone slip, or document request overdue |
| **Steps today (manual)** | 1) Manny assigns tasks in notes · 2) Copy from template checklist · 3) Set due dates by hand · 4) Chase assignees in Teams/email · 5) Close tasks when done |
| **Proposed automation** | `HVCG_CreateProjectFromTemplate` + SLA rules engine → auto-create `HVCG_Tasks` with roles (`ProjectManager`, `FinancialAnalyst`) · escalate overdue to `HVCG_AI_Escalations` · internal only |
| **Systems** | PA, `HVCG_Tasks`, `HVCG_Projects`, `HVCG_Milestones`, project template JSON |
| **Hrs/wk saved** | 2.0 |
| **Priority** | P1 |
| **Owner approval needed?** | **No** |

---

## A13 — Executive reporting (snapshot assembly)

| Field | Value |
|-------|-------|
| **Trigger** | Nightly + on-demand before owner sync |
| **Steps today (manual)** | 1) Open 6+ markdown registers · 2) Copy KPIs into `EXECUTIVE_SNAPSHOT` · 3) Update client health table · 4) Note blockers · 5) Email summary to owner |
| **Proposed automation** | Agent + PA: read registers (`PRICING_REGISTER`, `CLIENT_HEALTH_DASHBOARD.json`, pipeline status) → render `EXECUTIVE_SNAPSHOT.md` + `EXECUTIVE_DASHBOARD_STATUS.md` → upsert Command Center lists · **No email send** |
| **Systems** | AI agents, PA, SP Command Center, `executive/*` docs |
| **Hrs/wk saved** | 2.0 |
| **Priority** | **P0** |
| **Owner approval needed?** | **No** |

---

## A14 — Internal Teams / notification routing (staff only)

| Field | Value |
|-------|-------|
| **Trigger** | Automation failure, owner gate hit, high-score lead, onboarding complete |
| **Steps today (manual)** | 1) Manny texts/emails staff · 2) Ad-hoc Teams posts · 3) Lost context in inbox |
| **Proposed automation** | PA → `HVCG_Notifications` + optional Teams post (**staff channel only**, `HVCG_CRM_ENABLE_TEAMS_NOTIFY` gated Off until cleared) · no client-facing |
| **Systems** | PA, Teams, `HVCG_Notifications`, `HVCG_AutomationLogs` |
| **Hrs/wk saved** | 1.5 |
| **Priority** | P2 |
| **Owner approval needed?** | **No** (internal); **Yes** if enabling prod Teams webhook |

---

## A15 — Discovery / strategy call prep brief

| Field | Value |
|-------|-------|
| **Trigger** | 24h before `HVCG_Meetings` / Discovery Call |
| **Steps today (manual)** | 1) Re-read EVA JSON · 2) Pull client folder highlights · 3) Draft talking points · 4) Print one-pager for Manny |
| **Proposed automation** | AI job: Lead `Notes` eva_summary + opportunity fields → `HVCG_AI_MeetingSummaries` prep brief PDF in Dev library |
| **Systems** | AI (`HVCG_AI_MeetingSummaries`), CRM, SP |
| **Hrs/wk saved** | 1.5 |
| **Priority** | P1 |
| **Owner approval needed?** | **No** |

---

## A16 — Legacy client migration packet (ACCG / HVS)

| Field | Value |
|-------|-------|
| **Trigger** | New legacy client classified or `crm-import/*_dev_shell.json` ready |
| **Steps today (manual)** | 1) Run discovery census · 2) Write PROFILE.md · 3) Build onboarding packet · 4) Draft Dev shell JSON · 5) Score client health · 6) Wait for owner price/class gates |
| **Proposed automation** | Script/agent: `ALL_CLIENTS_DISCOVERY.json` + inventory → generate PROFILE.md + `profile.json` + health score per `CLIENT_HEALTH_RUBRIC` → stage `crm-import` row · **No Prod import** |
| **Systems** | Python agents, `inventory/*`, `crm-import/`, executive rubric |
| **Hrs/wk saved** | 2.0 |
| **Priority** | P1 |
| **Owner approval needed?** | **Yes** — Dev CRM import (**BL-ACCG-***), pricing (**BL-ACCG-PRICE**) |

---

## A17 — Lead scoring refresh (batch recompute)

| Field | Value |
|-------|-------|
| **Trigger** | Nightly or on EVA resubmit |
| **Steps today (manual)** | 1) Export leads · 2) Apply scoring spreadsheet · 3) Paste scores back · 4) Decide who calls |
| **Proposed automation** | PA applies `SALES_PIPELINE_STATUS` point rules to all open `HVCG_Leads` → update `LeadScore` → flag ≥70 for opportunity creation draft |
| **Systems** | PA, `HVCG_Leads`, scoring spec |
| **Hrs/wk saved** | 1.0 |
| **Priority** | P1 |
| **Owner approval needed?** | **No** |

---

## A18 — Client health dashboard regeneration

| Field | Value |
|-------|-------|
| **Trigger** | Profile/packet/inventory change or weekly schedule |
| **Steps today (manual)** | 1) Open each client PROFILE · 2) Update health score · 3) Edit `CLIENT_HEALTH_DASHBOARD.md` table by hand · 4) Sync JSON |
| **Proposed automation** | `generate_client_profiles.py` / agent pipeline → refresh `CLIENT_HEALTH_DASHBOARD.md` + `.json` from rubric inputs · no CRM write |
| **Systems** | Python, `executive/CLIENT_HEALTH_*`, client packets |
| **Hrs/wk saved** | 1.5 |
| **Priority** | P1 |
| **Owner approval needed?** | **No** |

---

## A19 — Secure upload / portal intake routing (staging)

| Field | Value |
|-------|-------|
| **Trigger** | File landed in secure upload staging or client folder 00-Inbox |
| **Steps today (manual)** | 1) Notice upload email · 2) Download file · 3) Rename · 4) Move to correct folder · 5) Update doc request status · 6) Notify analyst |
| **Proposed automation** | PA on SP file created → classify doc type → move to target folder per workspace plan → mark `HVCG_DocumentRequests` received · internal notification only |
| **Systems** | SP, PA, Portal staging, `HVCG_DocumentRequests` |
| **Hrs/wk saved** | 2.0 |
| **Priority** | P2 |
| **Owner approval needed?** | **No** (Dev/staging); **Yes** — Prod portal (**PROD-1**, **BL-C1**) |

---

## A20 — Invoice PDF extract pipeline

| Field | Value |
|-------|-------|
| **Trigger** | New PDF in client invoice folders or manual batch |
| **Steps today (manual)** | 1) Open each PDF · 2) Type amount/date/client · 3) Update `pdf_billing_extracts.json` · 4) Fix OCR misses |
| **Proposed automation** | Scheduled script (`pypdf`/`pdfminer`) → append extracts → optional Dev `HVCG_Invoices` upsert · feeds A07 |
| **Systems** | Python, `inventory/pdf_billing_extracts.json`, `HVCG_Invoices` |
| **Hrs/wk saved** | 1.5 |
| **Priority** | P1 |
| **Owner approval needed?** | **No** |

---

## A21 — Equity capital raise project spawn

| Field | Value |
|-------|-------|
| **Trigger** | Service package SKU equity path on Won or advisor initiates raise |
| **Steps today (manual)** | 1) Pick template · 2) Customize milestones · 3) Create lender/investor lists · 4) Assign workstreams |
| **Proposed automation** | `HVCG_CreateProjectFromTemplate` with `equity-capital-raise.json` / `investor-presentation.json` → seed tasks, doc requests, outreach list shells |
| **Systems** | PA, project templates, `HVCG_Projects`, `HVCG_Investors` |
| **Hrs/wk saved** | 1.5 |
| **Priority** | P2 |
| **Owner approval needed?** | **No** (internal project); **Yes** — investor outreach send |

---

## A22 — Command Center metric sync (CRM → SP → PBI)

| Field | Value |
|-------|-------|
| **Trigger** | Nightly Dev job post CRM import |
| **Steps today (manual)** | 1) Query CRM exports · 2) Update dashboard mock values · 3) Refresh Power BI manually · 4) Compare to registers |
| **Proposed automation** | `COMMAND_CENTER_WIRE_PLAN` Phase 2–3: PA read Dataverse Dev → upsert `ExecutiveMetricsSnapshot` → Power BI dataset refresh (Dev workspace only) |
| **Systems** | PA, Dataverse Dev, SP Command Center, Power BI Dev |
| **Hrs/wk saved** | 1.5 |
| **Priority** | P1 |
| **Owner approval needed?** | **Yes** — Prod publish (**PROD-1**); **No** for Dev snapshot |

---

## Priority legend

| Priority | Meaning |
|----------|---------|
| **P0** | Blocks Manny weekly; high hours; spec-ready |
| **P1** | Material savings; build within 2 sprints |
| **P2** | Nice-to-have; depends on P0 infra |
| **P3** | Deferred / owner-blocked long pole |

---

## Owner gates reference

| ID | Blocks |
|----|--------|
| **BL-C1** | Client email, portal invite, outbound proposals, lender/investor send |
| **BL-F1** | Bank/payment processor connections |
| **BL-GRAPH-1** | Graph mail/calendar read |
| **BL-W1** | Website Forms → CRM wiring |
| **D-002** | Power Automate flow import (Maker) |
| **PROD-1** | Any production deployment |
| **BL-ACCG-*** | Legacy client price/class/import |

---

## Related specs

- `onboarding/AUTOMATED_ONBOARDING_SPEC.md`
- `sales/PROPOSAL_TEMPLATE.md`
- `funnel/EVA_INTAKE_TO_CRM_MAP.md`
- `executive/COMMAND_CENTER_WIRE_PLAN.md`
- `IMPLEMENTATION_QUEUE.md` (ranked build order)

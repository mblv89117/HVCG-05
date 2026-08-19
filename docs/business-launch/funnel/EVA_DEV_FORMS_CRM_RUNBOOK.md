# EVA Dev Forms → CRM Runbook

**As of:** 2026-07-16  
**Owner:** Revenue Systems  
**Goal:** First scored lead in **Dev** `HVCG_Leads` from EVA intake  
**Prod:** Forbidden — do not change Production site URL or Turn On in Prod  

---

## Business outcome

Prospect completes EVA → CRM has a **New** lead with score, band, and next step = Capital Readiness → owner qualifies manually → existing Prod/Dev `HVCG_LeadQualifiedCreateOpportunity` creates the opportunity.

---

## Prerequisites

| Item | Status |
|------|--------|
| Track 1 internal CRM | Live (LeadQualified in Prod; use Dev lists for this wire) |
| EVA field map | `EVA_INTAKE_TO_CRM_MAP.md` + `EVA_CRM_PAYLOAD_SCHEMA.md` |
| Flow definition | `src/power-automate/definitions/HVCG_EvaFormCreateLead.definition.json` (`Off`) |
| Staging form (local) | `website/staging/assessments/eva.html` — CRM-ready JSON |
| Scoring CLI | `sales/score_eva_json.py` |
| Gates | No BL-C1 (no prospect email). No BL-PUBLISH-1 (no public DNS). |

---

## Path A — HTTP smoke (fastest, no Forms yet)

1. Import / recreate `HVCG_EvaFormCreateLead` in **Dev** solution (or My flows → Dev connections).  
2. Confirm env var `hvcg_CommandCenterSiteUrl` = Dev Command Center.  
3. Confirm `hvcg_EnableClientEmails=false`.  
4. Leave flow **Off** until smoke ready, then Turn On **in Dev only**.  
5. Offline validate fixtures:

```bash
cd docs/business-launch   # or master-pm worktree path
python3 sales/score_eva_json.py funnel/fixtures/eva_smoke_pass.json --crm
python3 sales/score_eva_json.py funnel/fixtures/eva_smoke_legacy_block.json --crm
```

6. POST `funnel/fixtures/eva_smoke_pass.json` to the flow HTTP URL.  
7. Verify Dev `HVCG_Leads`: Title = Northridge Manufacturing LLC, Source = Website-EVA, LeadStatus = New, LeadScore set, Notes contains `eva_summary`.  
8. POST same payload again → skip (idempotent).  
9. POST `eva_smoke_legacy_block.json` → no priced lead create (legacy abort).  
10. Manually set LeadStatus = Qualified on the smoke lead → confirm LeadQualified creates Opportunity (Dev).  

**Pass criteria:** steps 7–10 green; zero prospect emails.

---

## Path B — Microsoft Forms (owner / maker)

### 1. Create Form (org-restricted)

Title: **HVCG Enterprise Value Assessment (Dev)**  
Questions (required unless noted):

| # | Question | Type | Maps to payload |
|---|----------|------|-----------------|
| 1 | First name | Text | `contact.firstName` |
| 2 | Last name | Text | `contact.lastName` |
| 3 | Email | Text | `contact.email` |
| 4 | Phone | Text | `contact.phone` (optional) |
| 5 | Role | Choice | `contact.role` |
| 6 | Decision-maker? | Yes/No | `contact.isDecisionMaker` |
| 7 | Legal business name | Text | `company.legalName` |
| 8 | Revenue band | Choice 1–4 labels | `company.revenueBand` |
| 9 | Books quality | Choice 1–4 | `company.books` |
| 10 | Capital intent | Choice debt/equity/both/none | `company.capital` |
| 11 | Timeline | Choice 1–4 | `company.timeline` |
| 12 | Value-driver themes | Multi | `company.valueDriverThemes` |
| 13 | Primary challenge | Text long | `company.challenge` |
| 14 | HVCG prospect confirm | Yes required | `consent.hvcgProspect` |
| 15 | Disclaimer | Yes required | `consent.disclaimerAccepted` |

Footer text: Not a valuation or financing decision. Final pricing requires owner approval. Link disclaimer page when site hosts.

### 2. Wire Automate

1. Trigger: **When a new response is submitted** (Forms).  
2. Get response details.  
3. Compose body matching `EVA_CRM_PAYLOAD_SCHEMA.md` (use response Id as `sessionId`).  
4. Either:  
   - Call child / HTTP `HVCG_EvaFormCreateLead`, or  
   - Inline the Create_Lead actions from the definition (same field map).  
5. Do **not** add Send email (Outlook) to the prospect.  
6. Optional internal notify: only if `hvcg_CrmEnableTeamsNotify` later approved — default Off.

### 3. Embed

Until public site: Form link for org testing only, or embed on org-restricted SharePoint page. Staging HTML remains local preview.

---

## What not to do

- Do not point the flow at Production SharePoint.  
- Do not set EstimatedValue / PipelineValue from the form.  
- Do not auto-set LeadStatus = Qualified.  
- Do not email dollar estimates to prospects (BL-C1).  
- Do not create leads for legacy HVS name matches.

---

## Handoff after first Dev lead

| Next | Owner |
|------|-------|
| Soft UAT Forms submit → Dev lead | Revenue + QA |
| Owner decision: org-restricted staging page | Master PM / Owner |
| Public DNS / BL-PUBLISH-1 | Owner gate |
| Prod flow activate | Owner + Deployment (explicit) |

---

## Related artifacts

| Artifact | Path |
|----------|------|
| Payload schema | `funnel/EVA_CRM_PAYLOAD_SCHEMA.md` |
| Flow | `src/power-automate/definitions/HVCG_EvaFormCreateLead.definition.json` |
| Fixtures | `funnel/fixtures/` |
| Staging UI | `website/staging/assessments/eva.html` |
| Scoring | `sales/score_eva_json.py` |
| Routing map | `go-live/track3-website/FORM_AND_CRM_ROUTING_MAP.md` |

# ASSUMPTIONS LOG

Assumptions are decisions made so work can continue without interrupting the owner for routine information. Update when contradicted by owner decision or discovered fact.

| ID | Date | Assumption | Rationale | Impact if wrong | Status |
|----|------|------------|-----------|-----------------|--------|
| A001 | 2026-07-14 | Tenant uses Microsoft 365 Business Premium with SharePoint, Teams, Power Automate (standard), Power Apps for M365 | Stated in brief | Premium features may need license purchase | Active |
| A002 | 2026-07-14 | Custom domain exists or will be `.onmicrosoft.com` until verified; placeholders used in config | Domain not provided | Email/URL updates required at deploy | Active |
| A003 | 2026-07-14 | Version 1 system of record = SharePoint Lists (not Dataverse) | Avoid premium cost; sufficient for mid-volume advisory ops | May migrate later if scale requires | Active |
| A004 | 2026-07-14 | Initial team ≤ 15 users including contractors | Typical fractional CFO / advisory firm | Security group design still scales | Active |
| A005 | 2026-07-14 | One SharePoint hub site + client document libraries under a Clients hub (not one site collection per client in V1) | Simpler admin; permissions via unique folder ACLs + security groups | Multi-site model can be V2 if isolation needs rise | Active |
| A006 | 2026-07-14 | Clients are US-based SMBs; financial docs are highly sensitive | Matches capital advisory context | Labeling/DLP tightened further if regulated differently | Active |
| A007 | 2026-07-14 | No live accounting integration in V1; operational finance fields only | Brief says not a replacement for accounting | Manual payment status updates | Active |
| A008 | 2026-07-14 | Power BI Pro available for Manny + ops lead; if not, Excel + SharePoint views suffice for V1 | Common with Business Premium add-on uncertainty | Report fallback path documented | Active |
| A009 | 2026-07-14 | Bookings and Forms available on Business Premium | Standard SKU inclusion | Manual scheduling fallback | Active |
| A010 | 2026-07-14 | External sharing = Specific people only; guests via Entra B2B for advisors | Least privilege | Policy may need tenant admin change | Active |
| A011 | 2026-07-14 | Service account `HVCG Ops Automation` owns flows; no personal connection ownership in prod | Microsoft best practice | Owner must create/service SA | Active |
| A012 | 2026-07-14 | Project templates use role placeholders (PM, Analyst, Ops) resolved at instantiation | Team not fully hired | Role mapping table configurable | Active |
| A013 | 2026-07-14 | Document reminder cadence: Day 0 request, +3 business days, +7, +14 then escalate to PM (not Manny) | Professional, non-spam | Cadence tunable in config | Active |
| A014 | 2026-07-14 | Client-facing Power Apps portal deferred; clients get email + secure SharePoint links only in V1 | Avoid Power Pages premium | Client dashboard = V2 | Active |
| A015 | 2026-07-14 | Currency = USD; dates = America/Los_Angeles | Owner location context | Configurable | Active |
| A016 | 2026-07-14 | Success-fee estimates are internal-only fields | Do not expose to clients | Correct sensitivity classification | Active |
| A017 | 2026-07-14 | PnP PowerShell + Graph used for provisioning; Azure Functions not required for V1 | Keep stack simple | Graph throttling handled with retries | Active |
| A019 | 2026-07-14 | Product elevated to HVCG OS pre-deploy with 67 lists on SharePoint SOR | Owner request; avoid redesign later for portal/AI | Monitor list thresholds; Dataverse trigger in SCALABILITY.md | Active |
| A020 | 2026-07-14 | Portal and Copilot Studio remain V2; entities provisioned now | Prepare without premium spend | Power Pages license later | Active |

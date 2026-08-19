# HVCG Owner Operating Guide

**As of:** 2026-08-18  
**Audience:** Manny (`manny@highvaluecapitalgroup.com`) and the next AI session  
**Status SoR:** [CURRENT_STATE.md](CURRENT_STATE.md)  
**Do not** start Gate 12, promote `main`, launch commercial products, or reopen the architecture audit. Documentation must not block a CRM Hub deploy.

The seven-system architecture is settled. Atlas owner recovery is complete. Normal client operations run on Atlas + the live HVCG website. Everything else below is either a supporting product or explicitly deferred.

Sign in to Atlas with **Manny’s Microsoft account only**. Owner role is not a substitute for client-group membership.

---

## 1. Atlas / HVCG OS

| | |
|---|---|
| **SYSTEM** | Atlas (Elite OS + Integration Hub + Business Architecture) |
| **PURPOSE** | Internal operating system: clients, projects, tasks, Command Center, HVCG finance ops |
| **CURRENT STATUS** | Production Elite/Hub are **LIVE** (Elite `e5740379` / `index-DvEHjcS6.js`; Hub `d22b55f`). SharePoint `HVCG_*` is V1 system of record. Local AI is off. Opportunity CRM operator (`a43803e`) is a **candidate**, not live-certified. `origin/main` (`b641fdd`) is not production. ACCG01 ACL Apply was not run. |
| **HOW MANNY ACCESSES IT** | Sign in at [Atlas Elite](https://zealous-rock-0090c7e1e.7.azurestaticapps.net) with `manny@highvaluecapitalgroup.com`. Hub: `https://app-atlas-integration-hub.azurewebsites.net` (auth required). |
| **WHAT TO USE IT FOR TODAY** | Command Center (`/command-center`), My Work (`/my-work`), Portfolio (`/portfolio`), Projects (`/projects`). Day-to-day client/project/task work backed by SharePoint. Website leads land in `HVCG_Leads`. Seven ClientCodes: ACCG01, CCB01, CPL01, HFD01, KAVA01, LIEN01, PDG01 (Manny-only groups). |
| **WHAT NOT TO USE IT FOR** | Dynamics/Dataverse CRM. Client 360 as a live client map. Initialize / Quick Capture / Microsoft sync / Archive (honestly disabled). Launching 360, Copilot, GCC commercial, Syndicate, or Best Day from Atlas. Adding anyone else to `HVCG-Client-*` groups. |
| **MANUAL FALLBACK** | [HVCG Project Command Center](https://highvaluecapitalgroup.sharepoint.com/sites/HVCG-CommandCenter) — lists `HVCG_*` (clients, projects, tasks, leads). |
| **CURRENTLY DEFERRED FEATURES** | Client 360 mapping (fail-closed). Dynamics/Dataverse. Gate 12 worktree retirement. Local AI. GitHub `main` promotion. Employee-to-client roster. |

---

## 2. Autonomous Marketing

| | |
|---|---|
| **SYSTEM** | HVCG public website / lead funnel |
| **PURPOSE** | Public GTM: Home, EVA assessment, Contact, Book Appointment |
| **CURRENT STATUS** | Live at [www.highvaluecapitalgroup.com](https://www.highvaluecapitalgroup.com). Contact/EVA/Book store in Azure Table buffer `HvcgWebsiteLeads`, then Hub upserts SharePoint `HVCG_Leads`. Not a second CRM. |
| **HOW MANNY ACCESSES IT** | Public site (no login). Follow-up in Atlas `HVCG_Leads` or SharePoint. |
| **WHAT TO USE IT FOR TODAY** | Public marketing and inbound lead capture. Check new leads in Atlas / SharePoint `HVCG_Leads`. |
| **WHAT NOT TO USE IT FOR** | Prospect email, paid ads, social auto-publish, Copilot/GCC/360 launch from this site. |
| **MANUAL FALLBACK** | If a form looks stuck: email `manuel@highvaluecapitalgroup.com`, then enter the lead in SharePoint `HVCG_Leads`. Ops buffer (`GET /api/ops/leads`, keyed) is retry-only. |
| **CURRENTLY DEFERRED FEATURES** | Live prospect email, Teams notify, social, paid acquisition. |

---

## 3. Growth Command Center (GCC)

| | |
|---|---|
| **SYSTEM** | Commercial CFO / financial-intelligence product |
| **PURPOSE** | Separate SaaS; HVCG may be a tenant. Not HVCG internal accounting. |
| **CURRENT STATUS** | Production app live at [growth-command-center-lbnt.vercel.app](https://growth-command-center-lbnt.vercel.app). Login page and `/api/health` are up. Demo mode is disabled in production. QuickBooks/Plaid are **not** proven live in production (local sandbox only). |
| **HOW MANNY ACCESSES IT** | Open the production URL and sign in (dashboard is behind login). |
| **WHAT TO USE IT FOR TODAY** | Product login / health check. Treat dashboards as the GCC product, not Atlas books. |
| **WHAT NOT TO USE IT FOR** | HVCG internal accounting. Assuming live QBO or Plaid bank feeds. |
| **MANUAL FALLBACK** | Atlas/SharePoint for HVCG operating records. |
| **CURRENTLY DEFERRED FEATURES** | Commercial GCC program, live QBO/Plaid production connectors. |

---

## 4. 360 Growth

| | |
|---|---|
| **SYSTEM** | Client-facing agentic marketing OS |
| **PURPOSE** | Multi-tenant growth/marketing product. Hart Family Dental is a tenant, not a separate product. |
| **CURRENT STATUS** | **Local / pilot only.** Publishing disabled. Path: `/Volumes/MacMiniPro2TB/360 Growth Solution`. App default port **3001**. |
| **HOW MANNY ACCESSES IT** | Local run only (`localhost:3001`). No production publish. |
| **WHAT TO USE IT FOR TODAY** | Hart pilot review on a local machine. |
| **WHAT NOT TO USE IT FOR** | Public DNS, production publish, or treating Hart as an eighth HVCG product. |
| **MANUAL FALLBACK** | Do not publish. Keep Hart work in the 360 repo / local app. |
| **CURRENTLY DEFERRED FEATURES** | Production launch, DNS, live publishing. |

---

## 5. Agent Copilot

| | |
|---|---|
| **SYSTEM** | Deep AI Business MRI / assessment product |
| **PURPOSE** | Full assessment product. Website EVA is only a lead funnel into this, not a third engine. |
| **CURRENT STATUS** | **Sanitized / demo only.** No confidential client data. Path: `/Volumes/MacMiniPro2TB/getagentcopilot.com`. |
| **HOW MANNY ACCESSES IT** | Local `npm run dev` → localhost:3000. Demo workspace is Meridian Field Services. |
| **WHAT TO USE IT FOR TODAY** | Demo / UAT walkthroughs with sanitized data. |
| **WHAT NOT TO USE IT FOR** | Real client assessments or production confidential data. |
| **MANUAL FALLBACK** | Do not put live client data in Copilot. Use Atlas notes if needed. |
| **CURRENTLY DEFERRED FEATURES** | Production Copilot, Entra + Azure SQL/Blob client data path. |

---

## 6. Elevated Syndicate

| | |
|---|---|
| **SYSTEM** | Private podcast production OS |
| **PURPOSE** | Independent Elevated Syndicate line |
| **CURRENT STATUS** | **Private / local.** Path: `/Volumes/MacMiniPro2TB/Elevated Syndicate`. Not a production HVCG deployment. |
| **HOW MANNY ACCESSES IT** | Local working tree only. |
| **WHAT TO USE IT FOR TODAY** | Private Syndicate work on this machine. |
| **WHAT NOT TO USE IT FOR** | HVCG client operations or Atlas CRM. |
| **MANUAL FALLBACK** | Keep Syndicate work in its own folder. |
| **CURRENTLY DEFERRED FEATURES** | Production deploy. |

---

## 7. Best Day Of My Life

| | |
|---|---|
| **SYSTEM** | Independent consulting website |
| **PURPOSE** | Separate brand/site |
| **CURRENT STATUS** | **Pre-launch.** Path: `/Volumes/MacMiniPro2TB/Best Day Of My Life Consulting Website`. |
| **HOW MANNY ACCESSES IT** | Local working tree only. |
| **WHAT TO USE IT FOR TODAY** | Draft/site work. Not live. |
| **WHAT NOT TO USE IT FOR** | HVCG client operations or Atlas. |
| **MANUAL FALLBACK** | Do not publish until a separate launch decision. |
| **CURRENTLY DEFERRED FEATURES** | Launch / DNS / production host. |

---

## Standing rules

- Never contact a client automatically without Manny approval.
- Never change existing-client pricing.
- Do not add anyone except Manny to `HVCG-Client-*` groups.
- Do not invent Client 360 mappings.
- Do not promote `integration/atlas-canonical` to `main`.
- Worktree retirement is housekeeping, not an owner-operability blocker.

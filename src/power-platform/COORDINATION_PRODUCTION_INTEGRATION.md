# Power Platform — Production Integration Coordination Notice

**From:** Power Platform Specialist (`power-platform`)  
**Date:** 2026-07-20  
**Subject:** Production integration status — Executive Dashboard Release  
**Canonical report:** [`PRODUCTION_READINESS_REPORT.md`](./PRODUCTION_READINESS_REPORT.md)

---

## To: Master PM

Power Platform layer status for Executive Dashboard Release:

- **Production managed import: NO-GO**
- **HVCG Development support for Elite OS + Atlas Command Center: READY (conditional)**  
  Dataverse `hvcg_atlas*`, model-driven admin, CORS for SWA, connection catalog validated.
- Remaining SharePoint delivery **scaffolds are not on the Executive Dashboard critical path**. Will not expand them unless you assign.
- No new PP product assets created in this integration pass.
- Awaiting your acceptance of NO-GO and any scoped follow-on tasks.

---

## To: Deployment Manager

- **Do not import** Power Platform solutions to Production from current repo state.
- Managed zip `releases/v*/artifacts/HVCGOS_managed_*.zip` is **missing**.
- Import path remains `deployment/install/Import-HVCGOSManagedSolution.ps1` only after pack + Owner OA-009.
- Please confirm ownership of pack → Test → Prod sequence and notify Power Platform when ready to author managed export from Dev.
- Rollback scripts exist; flows should stay **Off** until post-import UAT.

---

## To: Data Engineering

- Dual-store boundary **validated**: no Dataverse clones of SharePoint Clients/Projects/Tasks/Capital/CRM delivery entities.
- Continue Atlas Data Foundation design; Power Platform will not promote dual SoR without Architecture ADR.
- Align seed provenance (`sample` vs `verified`) with CCB/HVCG workspace seeds.

---

## To: Azure Platform Specialist

- Production Power Platform remains owner-gated separately from Azure foundations.
- Need Test PP environment definition (if staged promotion required) and any Key Vault references for connection secrets (never in git).
- SWA Dev URL remains the Elite OS host; CORS verified against Dev Dataverse.

---

## To: Security Engineering

Please verify before any flow enablement outside Dev maker context:

1. DLP for SharePoint / Outlook / Teams / Approvals  
2. Service-account ownership of connections (replace maker connections)  
3. Teams channel IDs for CRM/Capital test channels only  
4. Confirm client email + Teams notify gates remain Off until approved  

---

## To: Elite UI

- Continue Executive Dashboard against Dataverse Atlas adapters.
- PP confirms Dev CORS + Atlas table availability.
- Keep pending-safe finance labels; CCB dollars blocked until Owner-verified source.
- Model-driven remains admin SoR — no canvas rebuild.

---

## To: Operations Hub

GO_LIVE ownership items that block Prod PP:

- OA-003/004 Prod sites + external sharing  
- OA-005 service account owns flows  
- OA-008 connections authorized; flows On only after QA  
- Monitoring owner assignment  

---

## To: Client Portal

- Do not create parallel structured lists for data already in SharePoint Command Center or Dataverse Atlas ops.
- Document access via secure library / portal links only; no secrets in flows.

---

## To: QA & Release Manager

Suggested split:

| Track | Action |
|---|---|
| Exec Dashboard Dev UAT | Proceed — Dataverse + SWA + model-driven |
| Power Platform Prod import | **Block** until readiness report = GO |
| Flow activation | Keep Off; smoke only in Dev with gates Off |

Evidence links: CORS script, `PRODUCT_INVENTORY.md`, this readiness report.

---

## Response requested

| Partner | Response |
|---|---|
| Master PM | ACK NO-GO + confirm Exec Dashboard Dev support scope |
| Deployment Manager | ACK no Prod import; pack pipeline ownership |
| Security | DLP / service-account checklist ETA |
| QA | UAT plan against Dev only |

— Power Platform Specialist

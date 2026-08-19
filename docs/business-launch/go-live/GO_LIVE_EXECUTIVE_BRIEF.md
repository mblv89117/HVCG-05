# GO-LIVE EXECUTIVE BRIEF
**2026-07-15 · COO · No deploy/publish/import/send/DNS performed**

## 1. Actually deployable now
- **RC-1 Dev baseline** (frozen): solution 1.1.0.1, Dev smoke PASS  
- **Website preview pack** (31 pages): `go-live/track3-website/preview` + `serve_preview.sh` → `http://127.0.0.1:8765`  
- **Pilot shells + pre-import reports** for ACCG / Prodigy / Christie (files only)  
- **Daily Executive Brief script** (automation #5)  
- **Prod settings TEMPLATE** with Dev URLs stripped  

## 2. Still documentation / mockup only
- Production environment (does not appear in PAC)  
- Production solution import / connection bind  
- Canvas app publish  
- Live Microsoft Forms → CRM  
- Live booking  
- Public DNS / HTTPS edge  
- Automations #1–4 as running flows (specs/maps only)  
- Any Production client rows  

## 3. Owner actions required
- **GL-0:** Create or identify HVCG Production environment + Prod SharePoint URLs ([click-by-click](approvals/GL-0_PRODUCTION_ENVIRONMENT.md))  
- Later: explicit Prod deploy approval · pilot import approval · publish approval  

## 4. Credentials / approvals required
- Power Platform admin (create Prod env)  
- Prod Maker connection consents (SharePoint/Outlook/Teams/Approvals) when deploying  
- Optional later: Graph, DNS, hosting purchase, analytics  

## 5. Recommended deployment sequence
1. GL-0 Prod env + URLs  
2. Fill private Prod deploymentSettings + pack managed solution  
3. CEO signs Production Deployment Approval  
4. Backup → import → bind → env vars → smoke → evidence  
5. CEO approves 3-client pilot import  
6. Pilot acceptance  
7. Dev Forms→CRM · then hosted website preview  
8. GL-PUBLISH-1 only when ready  

## 6. First approval requested from you
**GL-0 — Production environment identity**  
Reply with Prod environment Display name + URL + ID, and Prod SharePoint site URLs (Command Center / Clients / Knowledge).  
Exact steps: `go-live/approvals/GL-0_PRODUCTION_ENVIRONMENT.md`

## 7. Expected result after that approval
COO completes Production deployment settings, packs the managed solution, and returns a **filled** Production Deployment Approval Request (environment, package hash, risks, rollback, your Maker clicks) for your explicit **GO/NO-GO** — still no deploy until that second approval.

---
Dashboard: `GO_LIVE_STATUS.md` · Tracks under `go-live/`

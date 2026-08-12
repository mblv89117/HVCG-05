# HVCG V2 — Risk System Audit (Sprint 9 BA-F)

**As of:** 2026-08-11  
**CR:** CR-HVCG-BA-V2-001  
**Rule:** Do not create a second case-management shell. Do not reuse ops `HVCG_Risks` for claims matters.

## Classification

| Capability | Classification | Notes |
|------------|----------------|-------|
| OFF-RISK-REVIEW / OFF-TAX-UE / OFF-CLAIMS / SL-RISK | **REUSE** | Canonical catalog |
| DIAG-RISK / offer decision engine | **REUSE** | Commercial routing |
| compliance-language.json | **REUSE** | Wired into matter outputs |
| DocumentRequests + folder `08`/`09` | **EXTEND** | Matter packages |
| HVCG_Approvals | **EXTEND** | Risk approval types |
| Client 360 shell | **EXTEND** | Risk tab added |
| AGT-TAX-APPEAL / UE / INS / CLAIMS / HR | **EXTEND** | Runtimes bound (were stubs) |
| Ops `HVCG_Risks` | **REUSE** (ops only) | Not claims matters |
| Capital / CFO / Procurement engines | **REUSE** | Cross-system signals |
| HVCG_RiskMatters / RiskEvidence | **NEW** | Dev schemas |
| risk_claims.py + policy | **NEW** | Operating engine |
| Elite `/risk` workbench | **NEW** (inside Elite) | No competing SPA |
| Live agency/insurer/attorney connectors | **DEFER** | Submission gated |
| Full elevated ACL productization | **DEFER** (partial IN_PROGRESS) | Flags present |
| Public HR service line | **DEFER** | Per SVC-008 |

## Duplicates avoided

- No second case shell
- No merge of ops Risks into Risk Matters
- No second Capital/CFO/Procurement logic
- No second CRM

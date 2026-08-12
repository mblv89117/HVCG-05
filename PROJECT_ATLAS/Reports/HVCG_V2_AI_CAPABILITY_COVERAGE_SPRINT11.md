# HVCG V2 AI Capability Coverage — Sprint 11

**CR:** CR-HVCG-BA-V2-001  
**As of:** 2026-08-11  
**Rule:** No agent is PRODUCTION_READY in Sprint 11. Config ≠ implemented.

## Canonical 18 (AGT-CFO-OPS is domain binding, not Agent 19)

| Agent | Config | Runtime | Domain | Tools | Approvals | UI | Tests | Production Gate | Highest maturity |
|-------|:------:|:-------:|--------|:-----:|:---------:|:--:|:----:|:---------------:|------------------|
| AGT-INTAKE (Client Intake Agent) | Y | N | Revenue | 2 | Y | N | N | GATED | `PRODUCTION_GATED` |
| AGT-DOC-CHECKLIST (Document Checklist Agent) | Y | Y | Capital | 3 | Y | Y | Y | GATED | `FULL_DEV_RUNTIME` |
| AGT-CAP-READY (Capital Readiness Agent) | Y | Y | Capital | 2 | Y | Y | Y | GATED | `FULL_DEV_RUNTIME` |
| AGT-FIN-PKG (Financial Package Agent) | Y | Y | Capital | 2 | Y | Y | Y | GATED | `FULL_DEV_RUNTIME` |
| AGT-PROCURE (Contract Procurement Agent) | Y | Y | Procurement | 2 | Y | Y | Y | GATED | `FULL_DEV_RUNTIME` |
| AGT-GOV-REG (Government Registration Agent) | Y | Y | Procurement | 2 | Y | Y | Y | GATED | `FULL_DEV_RUNTIME` |
| AGT-TAX-APPEAL (Regulatory / Tax Appeal Support Agent) | Y | Y | Risk | 2 | Y | Y | Y | GATED | `FULL_DEV_RUNTIME` |
| AGT-UE-CLAIM (Unemployment Claim Support Agent) | Y | Y | Risk | 2 | Y | Y | Y | GATED | `FULL_DEV_RUNTIME` |
| AGT-INS-REVIEW (Risk / Insurance Review Agent) | Y | Y | Risk | 1 | Y | Y | Y | GATED | `FULL_DEV_RUNTIME` |
| AGT-CLAIMS (Claims & Recovery Support Agent) | Y | Y | Risk | 2 | Y | Y | Y | GATED | `FULL_DEV_RUNTIME` |
| AGT-HR-DOCS (HR / Workforce Documentation Agent) | Y | Y | Risk | 1 | Y | Y | Y | GATED | `PRODUCTION_GATED` |
| AGT-PROPOSAL (Proposal & Pricing Agent) | Y | Y | Revenue | 3 | Y | N | Y | GATED | `FULL_DEV_RUNTIME` |
| AGT-CRM (CRM Update Agent) | Y | Y | CRM | 2 | Y | N | Y | GATED | `PRODUCTION_GATED` |
| AGT-INVOICE (Invoice & Payment Reconciliation Agent) | Y | Y | Billing | 1 | Y | N | Y | GATED | `PRODUCTION_GATED` |
| AGT-REFERRAL (Referral Partner Agent) | Y | Y | Referrals | 2 | Y | N | Y | GATED | `PRODUCTION_GATED` |
| AGT-SUCCESS (Client Success Agent) | Y | Y | Growth | 2 | Y | Y | Y | GATED | `PRODUCTION_GATED` |
| AGT-CONCIERGE (Executive Concierge Agent) | Y | N | Executive | 1 | Y | N | Y | GATED | `PRODUCTION_GATED` |
| AGT-SECOND-BRAIN (AI Second Brain Agent) | Y | Y | Knowledge | 2 | Y | Y | Y | GATED | `FULL_DEV_RUNTIME` |

## Maturity vocabulary

`CONFIG_ONLY` · `SERVICE_RUNTIME` · `DOMAIN_INTEGRATED` · `UI_INTEGRATED` · `APPROVAL_INTEGRATED` · `FULL_DEV_RUNTIME` · `PRODUCTION_GATED` · `PRODUCTION_READY` (none)

## Gates

- Risk ACL: `GATE-RISK-ELEVATED-ACL-PROD`
- BL-C1 active: `True`
- Production side-effect tools: DISABLED by default

## Evidence

- `config/business/ai_orchestrator.py`
- `config/business/ai_tools.json`
- `config/business/ai-governance-policy.json`
- `tests/unit/business/test_ai_orchestrator_sprint11.py`
- Elite: `AiOrchestrationWorkbench.tsx`

## Sprint 12 maturity delta

| Agent | Before (S11) | After (S12) |
|-------|--------------|-------------|
| AGT-INVOICE | SERVICE_RUNTIME | FULL_DEV_RUNTIME (PRODUCTION_GATED) |
| AGT-REFERRAL | SERVICE_RUNTIME | FULL_DEV_RUNTIME (PRODUCTION_GATED) |
| AGT-SECOND-BRAIN | FULL_DEV_RUNTIME | unchanged (consumes revenue truth) |

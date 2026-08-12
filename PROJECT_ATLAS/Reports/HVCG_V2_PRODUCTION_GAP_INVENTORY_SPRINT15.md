# HVCG V2 — Production Gap Inventory (Sprint 15 → Sprint 16/17 input)

**As of:** 2026-08-12 · **CR:** CR-HVCG-BA-V2-001  
**Rule:** Inventory only. Sprint 15 does not solve hardening.

## Identity / Authorization
- External Client Portal authentication
- Production role + matter authorization evidence
- Owner Support live elevated SharePoint ACL
- Cross-client negative tests in Production-like environments

## Data / Documents
- Upload malware/AV controls
- Production document download authorization
- Live Graph permission model review
- Source/version controls under live retrieval

## AI
- Production orchestrator environment
- Production tool availability + secrets
- Production Concierge authorization (not Dev runtime alone)
- Agent audit monitoring / alerting

## Finance
- Authoritative invoice/payment sources (QBO/bank)
- Live reconciliation
- Payout/refund/collection remain disabled until authorized

## Infrastructure
- Secrets management
- Environment configuration parity
- Logging, alerting, incident response, rollback

## Release
- Integration evidence (Sprint 15 pack) ✓ Development
- QA evidence
- Owner UAT
- Release candidate
- Written QA GO / Production GO (not issued)

## Known Production gates (all closed / unsatisfied)

See `atlas_integration.production_gate_registry()` and Decisions:
- GATE-RISK-ELEVATED-ACL-PROD
- GATE-CLIENT-PORTAL-PROD
- GATE-M365-SECOND-BRAIN-PROD
- BL-C1 ACTIVE
- TRACK1_FROZEN_LIVE_INTERNAL
- NO_PRODUCTION_AI_DEPLOY / NO_QBO_PLAID_LIVE / NO_MONEY_MOVEMENT / NO_*_SUBMISSION / NO_LEGACY_REPRICING / NO_HIGH_VALUE_FOUNDER_LAUNCH

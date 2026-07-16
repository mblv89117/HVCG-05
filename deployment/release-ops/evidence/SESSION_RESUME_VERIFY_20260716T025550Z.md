# Session resume verification — live Prod re-check

**When:** 2026-07-16T02:56Z (approx session start)  
**Auth:** HVCG-Dev-Maker → HVCG Production  
**Action:** Read-only PAC verification only — no Prod mutations

## Confirmed

| Item | Live result |
|------|-------------|
| Env | HVCG Production `f141a2cf-ae13-eb59-84c4-25817d899105` / `https://orgee2f7545.crm.dynamics.com/` |
| Org ID | `a34bbff3-b380-f111-8068-6045bd0a1f11` |
| Solution | HVCGCommandCenterDev 1.1.0.1 Managed |
| Config solution | HVCGProductionConfig 1.0.0.0 Unmanaged |
| Package SHA-256 | `515c692c213c4618e437b8d71fc62e2b708a52b2c5d8794a4384adb32d337cdf` MATCH |
| Connections PAC | 4/4 Connected (IDs match handoff) |
| Connection refs | 4/4 connectionid populated (IDs match handoff) |
| Env Values | Prod SharePoint URLs; TeamsNotify=false; EnableClientEmails=false |
| Flows | **1 Activated** (LeadQualified) · **14 Draft** |

## Flow detail (live)

HVCG_LeadQualifiedCreateOpportunity = Activated (`1716e663-153f-5588-af1a-56f3fb9ec2d4`)  
All other HVCG% Modern Flows = Draft

## Stale artifacts (do not trust over live)

- `GO_LIVE_STATUS.md` still says 15/15 Draft (pre-activation)
- agent-comms `78e2f652` smoke msg says 15 Draft (correct at 02:33Z; superseded)
- Functional smoke result JSON: never written (handoff §7B)

## Gate

Waiting for owner phrase before any diagnose/retest:
`APPROVE DIAGNOSE AND RERUN PROD LEADQUALIFIED FUNCTIONAL SMOKE`

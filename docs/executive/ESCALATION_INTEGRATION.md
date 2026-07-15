# Executive Command Center — Escalation Integration (read-only)

**Existing flow:** `HVCG_ExecutiveDecisionEscalation`  
**Owner of runtime package:** platform / prior automation agents  
**This module:** documents how CEO dashboard consumes outcomes — **no flow JSON edits**.

## Expected behavior (as designed)

1. Decision or client flags `RequiresExecutiveAttention`.  
2. Flow notifies Owner (email / Teams when enabled by owner).  
3. Item appears in `nfExecDecisionQueue` / attention rail on `scrHomeExec`.  
4. Owner acts in canvas or SharePoint; status leaves Proposed/Pending Decision.

## CEO surface bindings

| Signal | Canvas |
|--------|--------|
| Open executive decisions | `nfExecDecisionQueue` |
| Clients flagged | `nfExecNeedsAttentionClients` |
| Revenue / payment risk | `nfExecRevenueAtRisk`, past-due retainers |

## Config (do not change from this branch)

Environment variables used by the existing flow remain under platform control (`HVCG_EXECUTIVE_EMAIL`, outbound flags). This module assumes mocked / Off defaults in Dev until owner enables.

## Recommendation for integrator

If escalation message copy should deep-link to Exec Home, add a parameter or deep-link URL in a **separate** additive change on an automation-owned branch — not here.

# Flow integration — Executive Command Center

## Owned by this module

| Artifact | Path | State |
|----------|------|-------|
| Integration contract (this file) | `docs/executive/FLOW_INTEGRATION.md` | Active |
| Weekly executive brief scaffold | `src/power-automate/executive/HVCG_ExecutiveWeeklyBrief.json` | **Off** / not in CRM solution |
| Definition scaffold | `src/power-automate/executive/HVCG_ExecutiveWeeklyBrief.definition.json` | Packaging only |

## Must not modify (CRM / platform runtime)

- `src/power-automate/flows/HVCG_LeadQualifiedCreateOpportunity.json` (+ peers)  
- `src/power-automate/flows/HVCG_ExecutiveDecisionEscalation.json` — **read/document only**  
- Solution workflows under `src/power-platform/solutions/HVCGCommandCenterDev/` while Maker OA is active  

## Existing escalation contract (platform flow)

**Flow:** `HVCG_ExecutiveDecisionEscalation`  
**Trigger:** Item modified where `RequiresExecutiveAttention eq true` (multi-list pattern as implemented by platform owners)  
**Behavior:** 24h dedupe → compose brief → email `HVCG_EXECUTIVE_EMAIL` → notification row → automation log  

Escalate only for reasons in `config/hvcg.config.json` → `executiveEscalationRules` (see SOP).

## Recommended parent follow-up (not done here)

1. Keep `HVCG_ExecutiveDecisionEscalation` **Off** until Dev smoke with test mailbox.  
2. Optionally register weekly brief flow after shared `_index.json` merge recommendation.  
3. Do not enable Teams notify for executive brief without owner approval.

## Weekly brief intent (scaffold)

Monday 07:45 PT: compile KPI snapshot (pipeline, MRR, AR, capital, exec queue counts) → email Owner only when `hvcg_OpsEnableEmailNotify`-style exec flag is true (recommend new env var `hvcg_ExecEnableEmailDigest=false` via **recommendation**, not env file edit on this branch).

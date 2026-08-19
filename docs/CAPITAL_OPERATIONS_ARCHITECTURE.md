# Capital Operations — Architecture

**As of:** 2026-08-17  
**Classification:** Internal Atlas / HVCG OS module (not an eighth platform)  
**System of record:** SharePoint `HVCG_*` lists and client libraries. No Dataverse. No new database.

This is the module architecture. Canonical seven-system index: [architecture/HVCG_SYSTEM_INDEX.md](architecture/HVCG_SYSTEM_INDEX.md). Atlas status: [../PROJECT_ATLAS/CURRENT_STATE.md](../PROJECT_ATLAS/CURRENT_STATE.md).

---

## Position in HVCG

```
Clients / staff
  → Atlas Elite (Entra)
    → Atlas Hub (JWT)
      → development-json          (local / CI only)
      → Graph Selected lists      (production PM today: Projects/Tasks/Milestones/Clients)
      → [future] capital list IDs (BLOCKED until owner provisions + allowlists)
        → SharePoint HVCG_* + client libraries
```

Capital Operations extends Atlas. It does not sit beside Atlas as a product. GCC, 360, Agent Copilot, Autonomous Marketing, Elevated Syndicate, and Best Day remain separate systems.

---

## Runtime layers

| Layer | Role | Honest status |
|-------|------|----------------|
| Elite `/capital` | Operator UI: queues, pipeline, documents, strategy, offers, closing | **IMPLEMENTED** Command Center; 401/403 fail closed; Hub JSON or Graph per `INTEGRATION_CAPITAL_BACKEND` |
| Hub APIs | Authz, ClientCode isolation, adapters, audit | `/api/capital/*` implemented; Graph path exists in this branch; production App Settings not set |
| `atlas-capital-core` | Stages, checklist, matching, reviews, fees | In-repo library; unit-testable |
| SharePoint `HVCG_*` | Operational SoR for structured capital records | Schema JSON in repo; tenant columns/lists not provisioned by this file |
| Client libraries | Original files | Existing document model; originals preserved |
| `HVCG_AI*` lists | Gated AI jobs/outputs | Reuse; do not create a parallel AI bus |

Hub maps Hub camelCase contracts to SharePoint internal names. Unknown facts stay missing. The UI must not display guessed revenue, DSCR, or “best lender” as verified truth.

---

## Stage machine

23 stages in `packages/atlas-capital-core/src/stages.ts` (`CAPITAL_STAGES`). SharePoint `Stage` choices must match exactly.

- `FundingStatus` is **legacy** and remains required on `HVCG_CapitalOpportunities`.
- Hub may keep `FundingStatus` in sync via the documented lossy maps (`LEGACY_FUNDING_STATUS_TO_STAGE` / `STAGE_TO_LEGACY_FUNDING_STATUS`). Do not delete `FundingStatus`.
- Illegal transitions throw `InvalidStageTransitionError`.
- Manny gates: `AwaitingMannyStrategyApproval`, `AwaitingMannyShortlistApproval`.
- Terminal: `Funded`, `Declined`, `Withdrawn`, `ClosedArchived`.

Work queues (`NEEDS_ATTENTION`, `AWAITING_CLIENT`, `AWAITING_LENDER`, `AWAITING_MANNY`, `OFFERS_RECEIVED`, `CLOSING`, `FUNDED`) are derived from stage + open checklist items. They are not a separate SoR.

---

## Write path (intended)

1. Actor authenticated via Elite/Hub.
2. ClientCode / role checks (existing Hub pattern; Capital Advisor / Owner as required).
3. Process rules in `atlas-capital-core` (stage, checklist override reason, matching band).
4. Persist:
   - **Now (dev):** Hub JSON store.
   - **Later (prod):** Graph item create/patch on allowlisted capital list IDs.
5. `HVCG_AuditEvents` for stage change, Manny decision, checklist override, fee legal flag.

No Hub route may proxy arbitrary Graph lists. Capital must go through the same allowlist style as PM.

---

## What this architecture refuses

- Auto-submit to lenders or auto-send client/lender email
- Promoting AI extraction to `VERIFIED`
- `BEST_FIT` when product criteria are `STALE` or `UNKNOWN`
- Storing raw EIN/SSN on `HVCG_CapitalProfiles` (`EINProtected` defaults true)
- Using ACCG/Prodigy files as fixture PII
- Merging GCC ledgers or Copilot assessments into Atlas capital lists

---

## Provisioning boundary

Application code cannot honestly enable production capital writes by default. Owner must:

1. Add **additive columns** to existing lists (`HVCG_CapitalOpportunities`, `HVCG_DocumentRequests`, `HVCG_LenderOutreach`). Do **not** create duplicate lists. Do **not** create `HVCG_CapitalStrategies` / Profiles / Offers for the min slice.
2. Grant list-level `write` (Lists.Selected) on those three lists to Hub identity `id-atlas-prod` (`2b9ca61d-2396-4caa-95cd-30200d2ff36a`).
3. Set Hub App Settings: `INTEGRATION_CAPITAL_BACKEND=sharepoint` plus `INTEGRATION_CAPITAL_*_LIST_ID` (see `docs/CAPITAL_RELEASE_HANDOFF.md`).
4. Deploy the Hub zip that includes capital Graph. Keep `INTEGRATION_CAPITAL_ALLOW_SYNTHETIC_GRAPH=false` except during a labeled QA pilot.

**LIVE (2026-08-19):** Hub `/health` already reports `capitalBackend.mode=sharepoint` on `a43803e`. Unset/code default remains fail-closed `unavailable`. **ACCG01 ACL Apply was not run** — do not treat health mode as grant proof. Capital Elite candidate `b9806bc` is **not** live. CRM operator is LIVE DEPLOYED; signed-in Premium UI remains HOLD.

---

## Related

Data model: [CAPITAL_DATA_MODEL.md](CAPITAL_DATA_MODEL.md)  
Workflow: [CAPITAL_WORKFLOW.md](CAPITAL_WORKFLOW.md)  
Security: [CAPITAL_SECURITY.md](CAPITAL_SECURITY.md)

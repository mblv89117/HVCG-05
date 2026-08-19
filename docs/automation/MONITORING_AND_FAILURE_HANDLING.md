# Monitoring and Failure Handling

## Logging standard

Every product flow writes to `HVCG_AutomationLogs`:

| Status | When |
|--------|------|
| Started | Run begin |
| Succeeded | Run end OK |
| Failed | Catch / stage failure |
| SkippedDuplicate | Idempotency hit |

Include `FlowName`, `RunId` (Maker), `Message`, `IdempotencyKey`, `ClientCode` when known. Never log tokens, connection strings, or Restricted Financial payloads.

## Retry

- Per-action retry: max **3**, delay ~60s (definition `runtimeConfiguration.retryPolicy`)
- No unlimited loops
- Recurrence flows rely on next schedule after failure digest

## Owner / admin notification

1. **Immediate:** definition `Failure_Notify_Admin` → `hvcg_OpsEmail` subject `FLOW FAILED: {FlowName}` (required on new scaffolds)
2. **Digest:** `HVCG_AutomationFailureDigest` hourly → Ops email + `HVCG_OperationalAlerts` when ≥3 failures for same FlowName in window
3. **Center:** Registry `FailureState=Failed|Degraded`

## Loop prevention

- Idempotency keys per business entity + date/status
- Flows must not write fields that re-trigger themselves without a status gate
- Failure digest ignores its own Succeeded/Started rows for alert aggregation

## Confidential data

- Teams/email payloads: titles, stages, weighted amounts only — no TIN/bank/package bodies
- Client email only via `HVCG_ClientNotificationApproved` + `HVCG_ENABLE_CLIENT_EMAILS` + `Status=ApprovedSend`

## Daily ops checklist

1. Open AutomationLogs **Failed Last 24h** (or Automation Center KPI)
2. Match RunId in Maker
3. Fix data/connection; re-run safely (expect SkippedDuplicate if already applied)
4. Clear or update Registry `FailureState` after recovery

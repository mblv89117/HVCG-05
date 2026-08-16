# Additive schema changes — Client Workspace V1 / historical unification

**Date:** 2026-08-14  
**Rule:** additive non-destructive columns only. No deletes, renames, type changes, list replacements, or 83rd list.

## HVCG_Clients (52 → 55)

| Field | Type | Why |
|---|---|---|
| SourceOrg | Choice HVCG / HVS / Unknown | Preserve HVS→HVCG provenance. Do not rewrite HVS as HVCG. |
| HistoricalStatus | Choice Current / Historical / Unknown | Historical vs current relationship. Existing ClientCodes never renamed. |
| ProvenanceSource | Text | Durable source attribution for reconstructed history. |

## HVCG_Communications (13 → 22)

| Field | Type | Why |
|---|---|---|
| SourceMessageId | Text, indexed | Graph message id. Index only — do not copy mailbox bodies. |
| ConversationId | Text, indexed | Thread-level consolidation. |
| InternetMessageId | Text, indexed | Durable RFC id. |
| OutlookWebLink | URL | Open source message in Outlook. |
| Participants | Note | Semicolon-separated participants. |
| LastActivityAt | DateTime, indexed | Last thread activity. |
| ProvenanceSource | Text | Source system label. |
| SourceOrg | Choice HVCG / HVS / Unknown | Origin label. |
| HVCG_IdempotencyKey | Text, indexed | Restartable migration writes. |

## Not changed

All other 80 lists. Hub Graph Selected grants remain the four MVP lists unless Azure env adds optional workspace list IDs. Ungranted lists render as **PARTIAL — SOURCE DATA NOT FOUND**.

## Live column provisioning

Schema JSON is the Atlas-owned contract. Live SharePoint columns are not auto-provisioned by this change. Do not invent a second SoR while columns are pending.

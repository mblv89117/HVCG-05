# FOLLOW_UP_SEQUENCES

**HARD RULE:** Sequence creates **drafts + calendar holds** only.  
**Send requires:** Manny approval per message (BL-C1 or explicit per-send).  

## SEQ-COLLECT-LEGACY-v1

| Step | Offset | Action | Auto-create | Auto-send |
|------|--------|--------|-------------|-----------|
| 1 | Day 0 | Draft REM_FRIENDLY + log queue | Yes | **No** |
| 2 | Day 7 | If still Open → draft REM_FIRM | Yes | **No** |
| 3 | Day 14 | If still Open → draft REM_FINAL | Yes | **No** |
| 4 | Day 21 | ESC_INTERNAL to Manny | Yes | N/A (internal) |
| 5 | Any | On payment logged → **Cancel remaining drafts** | Yes | — |

## SEQ-SALES-NURTURE-v1 (new HVCG prospects only)

| Step | Offset | Action | Auto-send |
|------|--------|--------|-----------|
| 1 | EVA complete | Internal task + draft thank-you | **No** |
| 2 | +2d | Draft “strategy call” invite copy | **No** |
| 3 | +5d | Draft proposal teaser (if Core/Growth recommended) | **No** |
| 4 | +10d | Internal stale-lead flag | Yes internal |

**Never** apply sales nurture to Legacy HVS clients’ AR sequences.

## Implementation note

Power Automate stubs should use Approvals connector or SharePoint “ApprovalStatus=Pending” column before any Outlook send action. Default path = stop at draft.

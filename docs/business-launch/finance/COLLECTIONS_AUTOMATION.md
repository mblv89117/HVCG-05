# COLLECTIONS_AUTOMATION

**ROI:** Cash flow · reduced manual chase · exec visibility  
**HARD RULE:** **Never contact a client automatically without Manny’s approval.**  
**As of:** 2026-07-15  

## Architecture (approval-gated)

```
Invoice / past-due signal
    → AR register update (auto)
    → Collections queue item (auto)
    → Draft reminder / follow-up (auto)
    → OWNER APPROVAL GATE  ←── Manny must approve
    → Human send only (Manny or designee)
    → Outcome logged to CRM Dev note
```

**Forbidden without BL-C1 / per-message approval:** auto-email, auto-SMS, auto-portal notify, auto-Teams ping to client.

## Components

| ID | Component | Auto? | Owner gate? |
|----|-----------|-------|-------------|
| C-01 | Detect past-due filename / AR flag | Yes | No |
| C-02 | Age buckets (Current / 1–30 / 31–60 / 61+) | Yes | No |
| C-03 | Draft reminder templates | Yes | **Yes to send** |
| C-04 | Follow-up sequence schedule (Day 0/7/14/21) | Yes (calendar only) | **Yes each send** |
| C-05 | AR dashboard refresh | Yes | No |
| C-06 | Escalation flag to Manny inbox (internal) | Yes internal | No (not client-facing) |

## Sequence (draft schedule — no auto-send)

| Day | Template | Channel | Status |
|-----|----------|---------|--------|
| 0 | `REM_FRIENDLY` | Email draft | Queued for approval |
| 7 | `REM_FIRM` | Email draft | Queued if still open |
| 14 | `REM_FINAL` | Email draft | Queued if still open |
| 21 | `ESC_INTERNAL` | Internal only → Manny | Auto OK (not client) |

See `REMINDER_TEMPLATES.md` · `FOLLOW_UP_SEQUENCES.md` · `APPROVAL_QUEUE.md`

# COLLECTIONS_FLOW_DEFINITION

**Flow name:** `HVCG_Collections_ApprovalGated_Dev`  
**Environment:** **Dev only** — no Production deployment without owner sign-off  
**Owner:** Manny · **Operator:** COO / Master PM  
**As of:** 2026-07-16  

## HARD RULES

| Rule | Enforcement |
|------|-------------|
| **Never auto-contact clients** | No `Outlook.Send`, SMS, portal notify, or shared-mailbox send without Approvals = **Approve** |
| **Draft-only default** | Flow stops at draft + queue row unless owner approves |
| **Legacy pricing** | ACCG $4,539/mo is **OWNER LOCKED** — see `LEGACY_PRICING_GUARD.md` |
| **Prod environment** | **FORBIDDEN** — this definition is Dev/staging only |

---

## Triggers (Dev)

| ID | Trigger | Scope |
|----|---------|-------|
| T-01 | Recurrence — daily 06:00 PT | Scan AR register for new past-due flags |
| T-02 | SharePoint — item created/modified | `CollectionsApprovalQueue` list when `PastDueSignal = true` |
| T-03 | Manual — "Test run" button (Dev only) | COO smoke test with synthetic row |

---

## Step-by-step flow (Dev)

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. TRIGGER (T-01 / T-02 / T-03)                                 │
└────────────────────────────┬────────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. GET AR CONTEXT                                               │
│    · Read INVOICE_REGISTER ref (50 rows)                        │
│    · Filter clients with past_due_signal OR age bucket 1–60     │
│    · Skip Christie if past_due = 0 (LOW — monitor only)         │
└────────────────────────────┬────────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. LEGACY PRICING GUARD (condition)                             │
│    · If ClientCode = ACCG01 → set PricingLock = OWNER_LOCKED    │
│    · Never mutate Amount / rate fields in draft                 │
└────────────────────────────┬────────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│ 4. RESOLVE TEMPLATE + SEQUENCE                                  │
│    · Map age bucket → REM_FRIENDLY / REM_FIRM / REM_FINAL       │
│    · Day 21+ → ESC_INTERNAL only (internal, not client)         │
│    · See FOLLOW_UP_SEQUENCES.md · REMINDER_TEMPLATES.md         │
└────────────────────────────┬────────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│ 5. COMPOSE DRAFT (no send)                                      │
│    · Merge placeholders: InvoiceNumber, Amount, DueDate, etc. │
│    · Write body to OneDrive Drafts / DraftEmails folder         │
│    · DraftPath = output path for owner review                   │
└────────────────────────────┬────────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│ 6. CREATE APPROVAL QUEUE ROW                                    │
│    · SharePoint list: CollectionsApprovalQueue                  │
│    · Status = PENDING_OWNER                                     │
│    · Link DraftPath + QueueId                                   │
└────────────────────────────┬────────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│ 7. NOTIFY OWNER (internal only)                                 │
│    · Teams or email → Manny ONLY                                │
│    · Subject: [COLLECTIONS DEV] QueueId pending approval        │
│    · Body: Client, Template, Amount, DraftPath link             │
│    · NOT client-facing                                          │
└────────────────────────────┬────────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│ 8. ★ APPROVALS GATE ★  (MANDATORY before any client action)     │
│    · Start and wait for an approval                             │
│    · Assigned to: Manny                                         │
│    · Title: Collections — {Client} — {Template} — {QueueId}     │
│    · Details: draft preview + amount + invoice refs             │
│    · Options: Approve · Reject · Request changes                │
└────────────────────────────┬────────────────────────────────────┘
                             ▼
                    ┌────────┴────────┐
                    │                 │
               Reject /            Approve
               Request              │
                    │                 ▼
                    ▼     ┌─────────────────────────────────────┐
         ┌──────────────┐ │ 9a. UPDATE QUEUE ROW                │
         │ 9b. CANCEL   │ │     Status = APPROVED               │
         │ Status =     │ │     ApprovedBy = approver           │
         │ REJECTED or  │ │     ApprovedAt = utcnow()           │
         │ CANCELLED    │ └──────────────┬──────────────────────┘
         │ STOP — no    │                ▼
         │ client send  │ ┌─────────────────────────────────────┐
         └──────────────┘ │ 9b. OUTLOOK SEND (Dev mailbox only) │
                          │     · ONLY after Approvals = Approve│
                          │     · Use approved draft body       │
                          │     · To = client contact (Dev test │
                          │       alias in Dev; prod FORBIDDEN) │
                          └──────────────┬──────────────────────┘
                                         ▼
                          ┌─────────────────────────────────────┐
                          │ 10. LOG OUTCOME                     │
                          │     · Status = SENT_BY_OWNER        │
                          │     · SentAt = utcnow()             │
                          │     · CRM Dev note (internal)       │
                          └─────────────────────────────────────┘
```

**Critical:** Steps 1–7 run automatically. Step 8 blocks indefinitely until Manny acts. Steps 9–10 execute **only** on Approve. Reject/Cancel terminates with **zero** client contact.

---

## Power Automate action map

| Step | Connector | Action | Client contact? |
|------|-----------|--------|-----------------|
| 2 | SharePoint / HTTP | Get items / GET register ref | No |
| 3 | Compose | Set variable `PricingLock` | No |
| 4 | Compose | Template selection | No |
| 5 | OneDrive / Compose | Save draft file | No |
| 6 | SharePoint | Create item | No |
| 7 | Teams / Outlook | Send email to Manny | No (internal) |
| 8 | **Approvals** | **Start and wait for an approval** | **Gate** |
| 9b | Outlook | Send email (V2) | **Yes — gated** |
| 10 | SharePoint | Update item + optional Dataverse note | No |

### Forbidden actions (without Step 8 = Approve)

- `Outlook.Send an email (V2)` to client domain
- `Office 365 Outlook — Send from shared mailbox`
- SMS / Twilio / ACS
- Power Pages / portal notification
- Any HTTP webhook that delivers message to client

---

## SharePoint list: CollectionsApprovalQueue

**Site:** HVCG Dev / Finance Ops (staging)  
**List display name:** Collections Approval Queue  
**Syncs with:** `APPROVAL_QUEUE.md` (human-readable mirror)

### Columns

| Column | Internal name | Type | Required | Notes |
|--------|---------------|------|----------|-------|
| Queue ID | `QueueId` | Single line text | Yes | Format: `Q-YYYYMMDD-NNN` |
| Client | `ClientName` | Single line text | Yes | Display name |
| Client Code | `ClientCode` | Choice | Yes | `ACCG01`, `PROD01`, `CHRP01`, … |
| Invoice ID | `InvoiceId` | Single line text | No | From register |
| Template | `Template` | Choice | Yes | `REM_FRIENDLY`, `REM_FIRM`, `REM_FINAL`, `ESC_INTERNAL` |
| Amount | `Amount` | Single line text | No | Display string; ACCG use locked `$4,539` |
| Amount USD | `AmountUSD` | Number | No | Numeric when extractable |
| Channel | `Channel` | Choice | Yes | `Email`, `Internal`, `PhoneTask` |
| Age Bucket | `AgeBucket` | Choice | No | `Current`, `1-30`, `31-60`, `61+` |
| Days Past Due | `DaysPastDue` | Number | No | Computed |
| Priority | `Priority` | Choice | No | `HIGH`, `MEDIUM`, `LOW` |
| Draft Path | `DraftPath` | Hyperlink | No | OneDrive draft URL |
| Draft Body Preview | `DraftPreview` | Multiple lines text | No | First 500 chars |
| Approval Status | `ApprovalStatus` | Choice | Yes | `PENDING_OWNER`, `APPROVED`, `REJECTED`, `SENT_BY_OWNER`, `CANCELLED` |
| Approval ID | `ApprovalId` | Single line text | No | Power Automate Approvals request ID |
| Approved By | `ApprovedBy` | Person | No | Manny or designee |
| Approved At | `ApprovedAt` | Date and time | No | UTC |
| Rejected Reason | `RejectedReason` | Multiple lines text | No | Owner notes |
| Sent At | `SentAt` | Date and time | No | UTC; blank until sent |
| Pricing Lock | `PricingLock` | Choice | No | `NONE`, `OWNER_LOCKED`, `LEGACY_BLOCK` |
| Sequence Step | `SequenceStep` | Number | No | 1–4 per FOLLOW_UP_SEQUENCES |
| Register Row Ref | `RegisterRowIndex` | Number | No | 1–50 index in INVOICE_REGISTER |
| Environment | `Environment` | Choice | Yes | **Default: `Dev`** — Prod disabled |
| Created | `Created` | Created | Auto | — |
| Modified | `Modified` | Modified | Auto | — |

### Choice values — ApprovalStatus

`PENDING_OWNER` · `APPROVED` · `REJECTED` · `SENT_BY_OWNER` · `CANCELLED`

### Seed rows (Dev mirror)

| QueueId | ClientCode | Template | Priority | ApprovalStatus |
|---------|------------|----------|----------|----------------|
| Q-20260715-001 | PROD01 | REM_FRIENDLY | HIGH | PENDING_OWNER |
| Q-20260715-002 | ACCG01 | REM_FRIENDLY | MEDIUM | PENDING_OWNER |

---

## Priority routing (from AR_DASHBOARD)

| Client | Priority | Flow behavior |
|--------|----------|---------------|
| Prodigy Games LLC | **HIGH** | Draft + queue on past-due; escalate internal if 61+ |
| ACCG Inc. | **MEDIUM** | Draft + queue; **never** change $4,539 rate in copy |
| Christie's Place LLC | **LOW** | Skip collections draft unless past_due > 0 |

---

## Dev vs Prod

| Capability | Dev | Prod |
|------------|-----|------|
| Auto-detect past-due | Allowed | **Not deployed** |
| Create draft + queue row | Allowed | **Not deployed** |
| Internal notify Manny | Allowed | **Not deployed** |
| Approvals gate | Required | N/A |
| Outlook send to client | Dev test alias only | **FORBIDDEN** |

---

## Related docs

- `../COLLECTIONS_AUTOMATION.md` — architecture overview  
- `../APPROVAL_QUEUE.md` — owner-facing queue mirror  
- `../REMINDER_TEMPLATES.md` — template bodies  
- `../FOLLOW_UP_SEQUENCES.md` — day offsets  
- `../LEGACY_PRICING_GUARD.md` — ACCG / legacy rules  
- `HVCG_Collections_DraftOnly.md` — prior stub (superseded by this definition)  
- `AR_DASHBOARD_DATA.json` — machine feed for dashboard consumers  

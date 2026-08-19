# Flow stub: HVCG_Collections_DraftOnly

**Environment:** Dev only  
**Trigger:** New/updated AR queue item OR daily inventory past-due flag  
**Actions (allowed):**
1. Create SharePoint/list row in Collections Approval Queue
2. Compose email body from REMINDER_TEMPLATES
3. Save draft to `DraftEmails` / OneDrive Drafts folder
4. Notify **Manny only** (internal Teams/email) that approval is waiting

**Actions (FORBIDDEN without Approvals = Approve):**
- Outlook send to client
- SMS
- Shared mailbox send
- Portal notification to client

**Post-approve path (manual or second flow):** Owner sends from their mailbox OR Approvals→Send with recorded QueueId.

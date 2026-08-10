# Phase 4C-1 Review Lifecycle

Statuses: Staged → Malware Scan Pending/Failed → Extraction Pending/Complete → Redaction Review → Waiting for Manny Redaction Approval → AI Enrichment Pending/In Progress → Draft Ready → Waiting on Manny → Returned for Revision / Approved Draft / Rejected → Archived → Purge Pending → Purged (also Failed/Cancelled/Expired).

Every transition is validated (`assertDurableTransition`) and audited.
Legacy Phase 4B statuses map via `toDurableStatus`.

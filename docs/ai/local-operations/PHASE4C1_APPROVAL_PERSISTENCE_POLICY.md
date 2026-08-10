# Phase 4C-1 Approval Persistence Policy

Persisted decisions: Approve/Reject/Return/Archive/No Action/Automation Candidate/Eliminate/Mark Duplicate/Mark Unique (+ prior redaction/purge decisions).

Always records `fileMoved=false`, `fileRenamed=false`, `authoritativeWrite=false`, `externalCommunication=false`.

Never triggers SharePoint/OneDrive/Dataverse/email/calendar/website/EVA/client activation.

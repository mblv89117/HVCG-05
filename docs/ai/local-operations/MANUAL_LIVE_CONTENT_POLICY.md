# Manual Live-Content Policy (Phase 3)

## Allowed sources (manual only)

- Manually pasted text
- Manually uploaded document text (paste/extract into pack)
- Manually selected meeting notes
- Manually selected emails **copied** into a review pack
- Manually selected client summaries

## Forbidden automatic reads

Do **not** automatically read Outlook, OneDrive, SharePoint, Dataverse, Gmail, calendars, or live client records.

## Required gate for every live-content job

1. Manny initiation  
2. Source confirmation (`sourceConfirmed=true`)  
3. Client identification  
4. Sensitivity classification  
5. Redaction preview  
6. Explicit approval to process (`Approve Redacted Content`)  
7. Audit correlation ID  

Non-synthetic content additionally requires `ownerApprovedLiveContent=true`.

Synthetic packs must include banners such as `TEST — SYNTHETIC DATA` / `TEST — DO NOT CONTACT`.

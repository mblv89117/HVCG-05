# Phase 4B-1 Supported File Policy

## Allowed (Manny explicit selection only)

| Extension | MIME (declared / detected) |
| --- | --- |
| `.pdf` | `application/pdf` |
| `.docx` | OOXML wordprocessingml or zip |
| `.xlsx` | OOXML spreadsheetml or zip |
| `.csv` | `text/csv`, `text/plain`, `application/csv` |
| `.txt` | `text/plain` |
| `.png` | `image/png` |
| `.jpg` / `.jpeg` | `image/jpeg` |

## Rejected

- Unsupported extensions (e.g. `.exe`, `.doc` legacy, `.eml`)
- Declared extension / detected MIME mismatch
- Oversized payloads (default **25 MB**)
- Automatic sources: Outlook attachments, SharePoint, OneDrive, Dataverse, inboxes, watched folders, scanners, network drives

## Labels for synthetic fixtures

- `TEST — DO NOT CONTACT`
- `TEST — SYNTHETIC DOCUMENT`

Do not use real client files in automated tests. Live client files require Manny’s explicit selection later.

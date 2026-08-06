# Duplicate Matching Policy (Phase 5A)

Deterministic only. No ML merge. No automatic merge of conflicts.

## Company signals

Normalized legal name, DBA, website domain, email domain, phone, address.

## Contact signals

Normalized email (exact), phone (probable), first+last+company (probable).

## Classes

| Class | Meaning |
| --- | --- |
| exact match | Strong identity (e.g. legal name + corroboration) |
| probable match | Multiple corroborating signals |
| possible match | Weak signals |
| new record | No usable match |
| conflict requiring Manny | Domain/email match without legal-name agreement |

Conflicts create a **separate** synthetic company and record evidence `conflict_kept_separate_from:<id>` — never auto-merge.

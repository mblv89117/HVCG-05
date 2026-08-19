# Decision History — Product Links

| Field | Value |
|-------|--------|
| Audience | Leadership, architects, docs |
| Status | CURRENT index (links only — do not rewrite history) |
| Last verified | 2026-07-20 |
| Owner | documentation-manager (index); decision owners remain Master PM / Owner / Architect |

## Rule

Append and link. Never delete or rewrite historical reasoning.

## Product-relevant decision sources

| Source | Path | Use |
|--------|------|-----|
| Authoritative Atlas decisions index | `.worktrees/project-atlas-authoritative/PROJECT_ATLAS/DECISIONS.md` | Active gates + closed business decisions |
| Continuation decision history | `.../CONTINUATION/DECISION_HISTORY.md` | Institutional DEC-#### history |
| Track 10 Microsoft-native architecture | `.worktrees/track10-elite-ui/PROJECT_ATLAS/Architecture/Track10MicrosoftNative.md` | Elite UI platform shape |
| Track 10 security / Entra / env | Track10 Architecture folder | Hosting and identity decisions |
| Root DECISION_LOG | repo `DECISION_LOG.md` | Older HVCG OS decisions — verify before citing as Elite UI |

## Standing product hard rules (from Atlas DECISIONS — do not weaken in user guides)

- Never contact a client automatically without Manny approval
- Never change existing-client pricing
- Never publish website publicly without publish gate
- Track 1 freeze gates remain in force for Production CRM
- Elite UI remains Development/UAT until owner-hosted promotion

## Documentation maintenance

When a new product decision is accepted:

1. Record it in the authoritative Atlas decision store (owner/Master PM).
2. Add one row to this index with date and path.
3. Update affected product guides in the **same** sprint as the code change.

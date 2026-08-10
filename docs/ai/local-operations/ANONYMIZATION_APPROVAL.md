# Anonymization Approval Process (Phase 3)

1. Create content pack (`POST /api/local-ai/content-packs`)
2. Review locally:
   - original content
   - proposed redacted content
   - detected sensitive fields / masking decisions
   - blocked / injection warnings
   - estimated character and approximate token size
3. Manny chooses exactly one:
   - **Approve Redacted Content** — unlocks model processing
   - **Edit Redactions** — replace redacted text; returns to awaiting approval (no model call)
   - **Cancel Job** — pack cancelled; no model call
4. Only after Approve may `POST .../process` run
5. Never send original unapproved content to Ollama

Elite UI: AI Operations Queue → Manual content pack → Approve / Edit / Cancel.

# Anonymization Approval Process

1. Create content pack (`POST /api/local-ai/content-packs`)
2. Review original (local detail), proposed redacted text, fields redacted, injection warnings, size
3. Choose: **Approve Redacted Content** | **Edit Redactions** | **Cancel Job**
4. Model is invoked only after Approve
5. Original unredacted content is not written to general application logs

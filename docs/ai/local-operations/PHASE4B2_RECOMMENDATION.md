# Phase 4B-2 Recommendation (do not start without authorization)

Possible next steps after Phase 4B-1:

1. Optional Ollama Fast/Deep **enrichment** of document review packs (still draft-only, still redaction-gated)
2. Expanded synthetic fixtures (scanned PDF, mixed PDF, DOCX/XLSX binaries, encrypted rejection evidence)
3. Wire a local malware scanner into the staging integration point
4. Stronger OCR confidence (TSV) + rotation/deskew
5. SharePoint approval-queue sync (**still no authoritative writes** unless separately authorized)
6. Keep Writes / ExternalMessages / EVA / ClientEmails **Off** unless separately authorized

**Do not begin SharePoint synchronization, automatic file organization, authoritative writes, EVA, or external communications without separate authorization.**

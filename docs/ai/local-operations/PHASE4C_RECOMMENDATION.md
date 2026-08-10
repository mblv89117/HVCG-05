# Phase 4C Recommendation (do not start without authorization)

Phase 4B-2 hardening is complete on the feature branch. Possible **Phase 4C** candidates (each requires separate written authorization):

1. Durable multi-document review packs + richer comparison UX  
2. SharePoint **approval-queue synchronization only** (still no authoritative business-record writes unless separately authorized)  
3. Optional local `clamd` socket (still no public network listener) for faster warm scans  
4. Broader OCR deskew tooling if owner authorizes ImageMagick/Pillow  
5. Keep `LocalAIWritesEnabled` / `LocalAIExternalMessagesEnabled` / `EvaIntakeEnabled` / `ClientEmailsEnabled` **Off** unless separately authorized  

**Do not begin SharePoint synchronization, automatic filing, authoritative writes, EVA activation, or external communications without separate authorization.**

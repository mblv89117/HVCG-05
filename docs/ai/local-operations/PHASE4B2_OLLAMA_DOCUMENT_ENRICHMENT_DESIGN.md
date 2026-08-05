# Phase 4B-2 Ollama Document Enrichment Design

## Gate order (non-bypassable)

1. Malware scan  
2. Deterministic extraction / OCR  
3. Redaction preview  
4. Injection scan  
5. Manny **Approve Redacted Content**  
6. Operation registry + model routing  
7. Loopback Ollama (or mock)  
8. Schema validation / merge  
9. Audit  

## Operations

Fast: `classify_document`, `summarize_document`, `extract_document_fields`, `identify_document_deadlines`, `identify_missing_signatures`, `identify_missing_pages`, `recommend_document_filename`, `recommend_document_folder`, routine invoice/bank/document reviews.

Deep: `review_complex_agreement`, `review_financing_document`, `identify_document_obligations`, `compare_document_versions`, `prepare_document_decision_package`, `prepare_document_review_pack`.

## Conflict policy

Deterministic extraction is authoritative for shared fields. Model disagreements are preserved in `conflicts[]`, confidence lowered, routed to Manny. Inference never silently overwrites deterministic values.

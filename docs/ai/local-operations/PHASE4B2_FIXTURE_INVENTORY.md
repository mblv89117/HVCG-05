# Phase 4B-2 Fixture Inventory

Generated in-memory by `documentFixtures.ts` (not committed as binary blobs). All labeled `TEST — DO NOT CONTACT` / `TEST — SYNTHETIC DOCUMENT`.

| Kind | Description |
| --- | --- |
| pdf_text | Embedded-text invoice PDF |
| pdf_*_placeholder | Near-empty PDFs for OCR paths |
| pdf_encrypted | `/Encrypt` PDF (rejected at staging) |
| docx_agreement / docx_missing_signature | OOXML agreements |
| docx_password_marker | Non-standard protected marker |
| xlsx_financial / formulas / external_link | Workbooks (no macro exec) |
| csv / csv_formula | Transactions + formula injection |
| png/jpg placeholders | Image OCR |
| injection / missing_page / prior_version / duplicate | Text scenarios |
| malformed | Invalid PDF bytes |

EICAR string helper available in `malwareScanner.ts` for when ClamAV is installed.

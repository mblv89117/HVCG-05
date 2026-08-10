# Phase 4B-2 Fixture Inventory (hardening)

Generators: `apps/atlas-integration-api/src/local-ai/documentFixtures.ts`  
Labels: `TEST — DO NOT CONTACT` / `TEST — SYNTHETIC DOCUMENT`  
No real client data. EICAR generated only in tests (not committed).

| Kind | Improvement |
| --- | --- |
| pdf_text | Embedded-text invoice PDF |
| pdf_scanned | **Real** image-only PDF via pdftoppm → JPEG embed |
| pdf_rotated | **Real** rotated scan (sips rotate) |
| pdf_poor | **Real** low-DPI (36) scan |
| pdf_mixed | Scanned/mixed path binary |
| docx_agreement / missing_signature | Real OOXML |
| xlsx_financial / formulas / external_link | Real workbooks |
| csv_formula | Formula-injection CSV |
| jpg/png invoice & rotated | Rasterized synthetic invoice images |
| png_lowres | Tiny PNG |
| agreement_deep / financing_deep | Deep-routing text fixtures |
| prior_version / missing_page | Text scenarios |

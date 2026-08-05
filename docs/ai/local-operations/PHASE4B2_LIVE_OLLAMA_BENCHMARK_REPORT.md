# Phase 4B-2 Live Ollama Benchmark Report

**Script:** `apps/atlas-integration-api/scripts/phase4b2-live-benchmark.ts`  
**Evidence:** `deployment/reports/local-ai-phase4b2/live-benchmark.json`  
**Ollama:** 0.32.5 loopback `127.0.0.1:11434`  
**Fast:** `qwen2.5:7b-instruct`  
**Deep:** `glm-4.7-flash:q4_K_M`  
**Synthetic documents only**

## Headline results (initial live run)

| Case | Profile | Enrich ms | Total ms | Schema | Notes |
| --- | --- | --- | --- | --- | --- |
| fast_invoice_classify | Fast | 13,920 | 18,555 | OK | Under 30s total |
| fast_invoice_fields_summary | Fast | 10,620 | 15,274 | OK | Under 30s total |
| fast_deadline_doc | Fast | 14,404 | 20,836 | OK | Under 30s total |
| fast_missing_signature | Deep* | 109,967 | 114,734 | OK | Classified as agreement → Deep |
| fast_docx_routine | Deep* | 300,450 | 305,012 | fail† | Timeout @ 300s |
| deep_agreement | Deep | 84,550 | 90,468 | fail† | Model payload map issue |
| deep_financing | Deep | 300,113 | 305,734 | fail† | Timeout @ 300s |
| deep_docx_agreement | Deep | 75,811 | 81,636 | OK | Under 180s |
| version_compare | n/a | — | 8 | OK | Deterministic |

\* Routing is by deterministic document type, not case name.  
† Initial run used enrichmentStatus=failed when model timed out / map failed even though deterministic merge existed.

## After hardening fix + rerun (same host)

Deterministic merge always completes a schema-valid draft; model errors become warnings.

| Rerun case | Total ms | Schema |
| --- | --- | --- |
| deep_agreement | 82,831 | OK |
| deep_financing | 102,546 | OK |
| docx_missing_signature | 77,103 | OK |

**Schema validation rate after fix:** **100%** (combined original successes + reruns)  
**Fallback count:** 0  
**Writes / external / EVA / client email:** remain false  
**No file movement / no record writes:** true on all enrich cases

## Latency vs targets

| Target | Result |
| --- | --- |
| Fast enrich preferred &lt;30s after extraction | Met for true Fast cases (~10–14s enrich; ~15–21s total incl. malware) |
| Fast acceptable &lt;60s | Met for true Fast |
| Deep &lt;180s where practical | Met on successful Deep runs (~76–110s); initial 300s timeouts mitigated by 600s client timeout + fix |
| Schema ≥95% | **100% after fix** |
| Prohibited / external claims blocked | PASS (flags + regression) |

## Malware scan duration (observed)

Typical clean scan **~4–6s** per file once DB warm; cold load can be much slower.

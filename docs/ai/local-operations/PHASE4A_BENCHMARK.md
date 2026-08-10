# Phase 4A Benchmark Report

Evidence: `deployment/reports/local-ai-phase4a/benchmark.json`

| Metric | Fast (`qwen2.5:7b-instruct`) | Deep (`glm-4.7-flash:q4_K_M`) |
|--------|------------------------------|------------------------------|
| Average total time | **~10.1 s** | **~77.8 s** |
| Schema validation rate | **100%** (8/8) | **100%** (2/2) |
| Under 30s | 8/8 | n/a (deep slower) |
| Under 60s | 8/8 | 0/2 |
| Writes | blocked | blocked |

Fast cases: summarize, classify, missing-info, agenda, meeting notes, status, injection doc, sensitive redaction path.  
Deep cases: decision package + forced deep summarize for comparison.

# Phase 5A Performance Report (Live Acceptance)

Honest local Mac Mini Pro timings against loopback Ollama:

| Stage | Observed |
| --- | --- |
| Intake validation | <5ms |
| Matching | <5ms |
| Fast preliminary | typically completes within 120s budget (12/12 Passed in acceptance run) |
| Deep complete review | dominant cost; generation often ~2–4 minutes |
| Total E2E (Full AI) | avg **~201s**, max **~370s**, min **~135s** |

Manny review estimate and time-saved fields are produced on each successful package. Deep remains slower than interactive CRM expectations — acceptable for Phase 5A local acceptance, not a Production SLA.

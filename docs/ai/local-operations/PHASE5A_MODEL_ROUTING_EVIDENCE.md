# Phase 5A Model Routing Evidence

| Role | Model | Timeout | Cap |
| --- | --- | --- | --- |
| Fast preliminary | `qwen2.5:7b-instruct` | 120s | `num_predict=256` |
| Deep complete | `glm-4.7-flash:q4_K_M` | ≥600s | `num_predict=2048` |

Recorded per hop on `submission.modelRouting[]`: requested/actual profile & model, fallback reason, queue/generation/total ms, schema result, confidence, retry count.

Fast failures are non-blocking; Deep schema/prohibited-claim failures mark submission `Failed` and exclude it from the Manny ready queue.

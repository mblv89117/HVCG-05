# Phase 4A Model-Routing Decision

| Profile | Model | Status |
|---------|-------|--------|
| Fast Operations | `qwen2.5:7b-instruct` | Authorized + installed |
| Deep Analysis | `glm-4.7-flash:q4_K_M` | Retained |
| Fallback | `glm-4.7-flash:q4_K_M` | Retained |

**Decision:** Promote Fast model into routine routing after benchmark PASS (100% schema on controlled Fast runs; avg ~10s; all Fast cases <30s).

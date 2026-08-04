# Phase 3 Security Review

| Control | Status |
| --- | --- |
| Loopback-only Ollama | Enforced (`OLLAMA_ALLOW_NON_LOOPBACK=false`) |
| External model calls | Blocked |
| Tool / shell execution from model path | Not granted |
| Direct DB access from model | Not granted |
| Automated file movement | Not implemented |
| External communications | `LocalAIExternalMessagesEnabled=false` |
| Authoritative record writes | `LocalAIWritesEnabled=false`; approval ≠ write |
| EVA intake | `EvaIntakeEnabled=false` |
| Client email automations | `ClientEmailsEnabled=false` |
| Redaction before model | Required |
| Injection scan | Preview + warnings |
| Secrets in git | Forbidden (`.secrets/` gitignored) |

**Residual risk:** Operator may paste sensitive live content; mitigated by redaction gate + ownerApprovedLiveContent flag + synthetic banner preference.

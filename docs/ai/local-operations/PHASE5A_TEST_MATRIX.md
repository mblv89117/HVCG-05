# Phase 5A Test Matrix

| Scenario | Covered |
| --- | --- |
| Valid synthetic submission | yes |
| Schema validation | yes |
| Idempotency / retry | yes |
| Duplicate company / contact | yes |
| Conflicting match | yes |
| Prospect creation + EVA linkage | yes |
| Deep-model review | yes (fake Ollama) |
| Fast preliminary | optional path present |
| Model fallback / malformed / offline | yes |
| Prompt-injection defense | input + output |
| Low-confidence escalation | yes |
| Manny decisions (qualify / more info / not fit / duplicate / archive / hold / return AI) | yes |
| Restart recovery | yes |
| No email / Production / SharePoint / Dataverse / Power Automate | by design + flag asserts |
| EvaIntakeEnabled / ClientEmailsEnabled false | yes |

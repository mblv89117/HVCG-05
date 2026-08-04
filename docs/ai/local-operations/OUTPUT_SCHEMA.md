# Output Schema — Phase 2 Ollama Response

SoR: `packages/atlas-integration-core/src/local-ai/ollamaOutput.ts`

```json
{
  "job_id": "",
  "operation": "",
  "executive_summary": "",
  "facts": [],
  "inferences": [],
  "missing_information": [],
  "risks": [],
  "recommended_next_action": "",
  "recommended_owner": "",
  "work_value_tier": "",
  "requires_manny_approval": true,
  "decision_package": {
    "decision": "",
    "recommendation": "",
    "why": [],
    "alternatives": [],
    "risks": [],
    "deadline": null,
    "required_review_minutes": 0,
    "source_records": [],
    "confidence": 0,
    "missing_information": []
  },
  "confidence": 0,
  "warnings": []
}
```

## Rejection rules

- Invalid / partial JSON / prose outside JSON
- Missing required fields
- Unauthorized action claims (email sent, record changed, etc.)
- Tool commands / secrets patterns
- Oversized responses
- Confidence out of range

Failed validation preserves the job and marks validation failed — never falsely completed.

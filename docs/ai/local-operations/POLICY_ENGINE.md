# Time-protection policy rules (v1.0.0-phase1)

Deterministic — **no LLM**.

Evaluation order:

1. Unnecessary → Tier 5 Eliminate / Unassigned
2. Duplicate → Tier 5 Eliminate (do not route to Manny)
3. Gated Manny action OR critical strategic risk → Tier 1 Manny + AI decision package path
4. Automation eligible → Tier 4 Automation
5. Batchable non-strategic → Tier 3 Local AI / Batch
6. AI can complete → Local AI Operations Agent
7. AI can prepare package → Local AI + optional escalation
8. Strategic leftover → escalate Manny
9. Else → Hold / Unassigned (do not auto-route to Manny)

Output: recommendedOwner, recommendedTier, recommendedDisposition, escalationRequired, reason, confidence, policyVersion, evaluation booleans, estimatedMannyTimeSavedMinutes.

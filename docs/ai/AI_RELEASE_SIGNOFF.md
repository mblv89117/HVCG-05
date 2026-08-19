# AI Production-Release Sign-Off

**Document type:** Release acceptance criteria + sign-off record
**Scope:** Product generative AI / Copilot-assisted features listed in [AI_FEATURE_INVENTORY.md](AI_FEATURE_INVENTORY.md)
**Out of scope:** Atlas Runtime, cloud-agent, dispatcher, orchestration engines, API-key/keychain, ATLAS-R

## 1. Release posture (current)

| Capability | Production posture |
|------------|-------------------|
| Executive Copilot grounded prompts (internal) | **Conditional allow** — follow allow-list + review rules |
| Deterministic executive weekly brief (non-AI) | Allowed as non-AI |
| AI queue schemas (drafts/summaries/packages) | **Schema-ready only** — not autonomous Production workers |
| Client Portal generative AI | **Not approved** |
| Finance generative worker | **Not present / not approved** |
| Capital package generative worker | **Not approved** until criteria below pass |

No generative worker may be enabled in Production until Section 3 is signed.

## 2. Acceptance criteria (must all pass)

### Transparency

- [ ] Every AI output shows AI-generated disclosure
- [ ] SourceRecordRefs / SourceSummary present
- [ ] GeneratedAt, PromptVersion, Generator recorded
- [ ] Confidence + VerificationStatus present
- [ ] OutputClass (Informational vs Actionable) present
- [ ] ResponsibleReviewer set when HumanReviewRequired

### Safety

- [ ] ExternalSendBlocked enforced; no autonomous send
- [ ] MayOverwriteVerifiedData=false enforced
- [ ] ClientCode isolation tested (cross-client deny)
- [ ] Prompt-injection tests pass
- [ ] Secret/PII redaction tests pass
- [ ] Unsafe tools disabled (share links, transactions, SoR deletes)

### Human control

- [ ] Accept / Reject / Dismiss implemented for gated queues
- [ ] Task conversion requires Accept
- [ ] No self-approval
- [ ] Owner gates for material capital/investor/legal/pricing

### Domain disclaimers

- [ ] FIN disclaimer on financial recommendations
- [ ] EVA disclaimer on enterprise-value assists
- [ ] CAPITAL disclaimer on capital/lender/investor drafts
- [ ] CLIENT disclosure ready if portal AI ever enabled

### Audit & retention

- [ ] Audit events for generate/review/deny/send-attempt
- [ ] Retention policy configured per [AI_AUDIT_REQUIREMENTS.md](AI_AUDIT_REQUIREMENTS.md)
- [ ] Reconciliation sample completed by QA

### Module reviews

- [ ] Executive Briefing review complete (this package)
- [ ] Finance Intelligence review complete (this package)
- [ ] Client-facing AI review complete (this package)
- [ ] Security Engineering acknowledged
- [ ] System Architecture acknowledged (schema/metadata)
- [ ] QA test evidence attached

## 3. Sign-off record

| Role | Name | Date | Decision (Approve / Conditional / Reject) | Notes |
|------|------|------|---------------------------------------------|-------|
| AI Governance | | | | |
| Security Engineering | | | | |
| System Architecture | | | | |
| QA / Release | | | | |
| Executive product owner | | | | |
| Finance product owner | | | | |
| Capital Advisory owner | | | | |
| Client Portal owner | | | | |
| HVCG Owner (if client/capital/finance external) | | | | |

**Release ID:** ________________
**Features in scope:** ________________
**Environment:** Development / Test / Production
**Autonomous workers enabled:** Yes / No (default No)

## 4. Conditional allow — Executive Copilot only

Internal use of `docs/executive/COPILOT_EXECUTIVE.md` prompts is permitted when:

1. Users are authenticated HVCG staff with SharePoint ACL access.
2. Prompts keep allow-list and “not in source” behavior.
3. External distribution requires Owner review.
4. No generative worker auto-posts briefs to clients.

This conditional allow does **not** authorize lender/investor package workers, portal AI, or finance auto-apply.

## 5. Rollback

If Production misuse is detected:

1. Disable affected Worker(s).
2. Quarantine outputs.
3. Preserve audit/cost/escalation evidence.
4. Notify Owner, Security, AI Governance.
5. Require new sign-off before re-enable.

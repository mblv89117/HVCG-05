# AI Review and Approval Rules

**Purpose:** Define human-review requirements and Accept / Reject / Dismiss workflows for product AI.

## 1. When human review is required

| Condition | Review required |
|-----------|-----------------|
| OutputClass = ActionableDraft or ActionableRecommendation | Yes |
| Client-facing or external potential | Yes |
| Financial, pricing, capital, lender, investor, legal | Yes |
| SOP/policy publish | Yes |
| Task conversion from AI suggestion | Yes |
| Executive brief marked client-external | Yes (Owner) |
| Internal Informational with GroundingStatus=Grounded and below cost/risk thresholds | Optional (Recommended for meeting summaries / task extraction) |
| GroundingStatus=Ungrounded | Yes — Approve for business use **forbidden**; Reject or regenerate |

See also [AI_APPROVAL_MATRIX.md](AI_APPROVAL_MATRIX.md) and [AI_GOVERNANCE_MATRIX.md](AI_GOVERNANCE_MATRIX.md).

## 2. Roles

| Role | May |
|------|-----|
| Responsible reviewer | Accept / Reject / Dismiss assigned items in domain |
| Ops Manager | Accept SOP publish |
| Capital Advisor | Accept capital/lender drafts; escalate material investor items |
| Finance analyst / PM | Accept financial analysis drafts |
| Owner | Owner-only and material capital/investor/legal/pricing |
| Generating worker | Never approve its own output |

## 3. Workflow states

```text
Generated (Unverified)
  → Pending Review
      → Accepted
      → Rejected
      → Dismissed
Accepted may promote to draft SoR / task / human-send queue
```

## 4. Accept

Allowed when all are true:

- HumanReviewRequired satisfied by a distinct human reviewer
- Insight metadata complete ([AI_INSIGHT_METADATA.md](AI_INSIGHT_METADATA.md))
- GroundingStatus is Grounded or Partial with ungrounded spans marked
- Required disclaimers present (FIN / EVA / CAPITAL / CLIENT as applicable)
- DataClassification and ClientCode valid for intended use
- ExternalSendBlocked remains true unless a separate human send step exists
- Confidence ≥ domain threshold (default: 0.6 internal informational; 0.75 actionable; 0.85 capital/finance external — tune with QA)

Effects:

- Set VerificationStatus=HumanVerified, ApprovalStatus=Approved
- Record DecisionBy / DecisionAt / reason
- Optionally create downstream draft/task with evidence links
- Write audit event

## 5. Reject

Use when content is wrong, unsafe, ungrounded for purpose, or policy-violating.

Effects:

- ApprovalStatus=Rejected; VerificationStatus=Rejected
- No SoR write; no send
- Capture reason code (Hallucination, Ungrounded, Policy, Quality, Injection, Other)
- Audit event; optional prompt feedback ticket

## 6. Dismiss

Use when the draft is irrelevant or duplicate but not necessarily unsafe.

Effects:

- ApprovalStatus=Dismissed
- No SoR write; no send
- Audit retained for metrics (noise rate)

## 7. Model-output review checklist

Reviewer confirms:

- [ ] AI disclosure visible
- [ ] Sources listed and spot-checked
- [ ] No invented figures
- [ ] Client isolation intact
- [ ] No secrets/PII over-disclosure
- [ ] Correct OutputClass
- [ ] Disclaimers present if FIN/EVA/CAPITAL/CLIENT
- [ ] Intended next step is human-controlled

## 8. Executive Briefing specific

- Internal P1–P5: reviewer = brief consumer or Owner delegate; mark Informational.
- P6 weekly draft: must include `[NEEDS OWNER REVIEW]` until Accepted.
- Client-external brief: Owner Accept only.

## 9. Finance Intelligence specific

- Any AI financial narrative: Analyst + PM Accept minimum.
- Pricing: Owner.
- Never Accept into Invoice/payment SoR fields.

## 10. Client-facing specific

- Portal generative: blocked until release sign-off.
- AI-drafted client email: Accept ≠ Send. Send is a separate human action with disclosure.

## 11. Capital Advisory specific

- Package drafts: Capital Advisor Accept; Owner if investor-material or binding.
- QC findings: Accept means “acknowledged for human remediation,” not “data auto-fixed.”
- EVA assist: Owner/Advisor Accept + EVA disclaimer; no silent field overwrite.

# Product AI Governance Matrix

**Purpose:** Define which AI actions may be automated, which require human approval, and which are prohibited.

Companion: [AI_APPROVAL_MATRIX.md](AI_APPROVAL_MATRIX.md), [AI_INSIGHT_METADATA.md](AI_INSIGHT_METADATA.md)

## 1. Decision keys

| Code | Meaning |
|------|---------|
| AUTO | Allowed without per-item human approval (still audited) |
| REVIEW | Human review required before use/publish/send |
| OWNER | Owner (or delegated Owner authority) required |
| PROHIBITED | Not allowed for product AI |

## 2. Matrix by action

| Action | Automation | Minimum approver | Notes |
|--------|------------|------------------|-------|
| Assemble context within ClientCode + classification | AUTO | — | Fail closed on cross-client |
| Generate internal informational draft to AI queue | AUTO | — | Must stamp insight metadata; HumanReviewRequired may still be true for later use |
| Display AI draft on internal review screen | AUTO | — | Must show disclosure + sources + confidence |
| Accept AI draft into draft business artifact | REVIEW | Domain reviewer | Never silent |
| Publish SOP / policy from AI draft | REVIEW | Ops Manager | |
| Convert suggested action → Task | REVIEW | PM / assignee owner | Accept workflow only |
| Send client email / Teams / portal message | REVIEW | PM → Ops (matrix) | PROHIBITED without human send step |
| Create external sharing link | PROHIBITED | — | |
| Patch verified Opportunity amounts/stages via AI | PROHIBITED | — | |
| Patch verified Invoice/payment fields via AI | PROHIBITED | — | |
| Patch Capital FundingStatus / TargetAmount via AI | PROHIBITED | — | |
| Financial analysis / pricing recommendation | REVIEW | Analyst + PM; Owner for pricing | FIN disclaimer |
| Capital recommendation | REVIEW | Capital Advisor; Owner if material | CAPITAL disclaimer |
| Lender recommendation | REVIEW | Capital Advisor | CAPITAL disclaimer |
| Investor recommendation | REVIEW/OWNER | Capital Advisor + Owner | CAPITAL disclaimer |
| EVA / enterprise-value estimate assist | REVIEW/OWNER | Capital Advisor + Owner if published | EVA disclaimer; never silent overwrite |
| Legal / compliance content | OWNER | Owner | |
| Executive brief internal | REVIEW | Meeting/brief owner or Owner | P6 banner |
| Executive brief client-external | OWNER | Owner | |
| Client Portal generative answers | PROHIBITED (until release sign-off) | Owner + Security + AI Governance | Disclosure mandatory if ever approved |
| Autonomous financial transaction | PROHIBITED | — | |
| Autonomous legal commitment | PROHIBITED | — | |
| Destructive delete of business records via AI | PROHIBITED | — | |
| Self-approval of own AI output | PROHIBITED | — | |

## 3. Module overlay

| Module | Default posture |
|--------|-----------------|
| Executive Dashboard / Briefings | Informational Copilot OK; actionable drafts REVIEW; external OWNER |
| Finance Intelligence | All $ analysis REVIEW; no AUTO apply |
| Revenue Systems | Copilot metadata AUTO; follow-ups REVIEW; CRM SoR fields PROHIBITED for AI overwrite |
| Operations Hub | Drafts AUTO into queue; publish REVIEW |
| Knowledge Platform | Extraction AUTO into queue; institutional publish REVIEW |
| Client Portal | Generative AI PROHIBITED until signed off |
| Capital Advisory | All package/recommendation paths REVIEW/OWNER; QC advisory only |

## 4. Task conversion rule

Suggested actions and extracted tasks:

1. Remain in AI queue as ActionableDraft.
2. Require Accept by responsible reviewer.
3. On Accept, create Task with link to AI evidence (JobId, SourceRecordRefs).
4. On Reject, mark Rejected with reason.
5. On Dismiss, mark Dismissed without creating work (audit retained).

## 5. Unsafe automation prevention checklist

Before enabling any worker tool:

- [ ] Tool not in SendExternal / ShareAnonymous / Transact / DeleteSoR classes without Owner policy exception
- [ ] ExternalSendBlocked=true for communication tools
- [ ] MayOverwriteVerifiedData=false
- [ ] Idempotency and no blind retry on side effects
- [ ] Prompt-injection tests pass
- [ ] Audit event on attempt and outcome

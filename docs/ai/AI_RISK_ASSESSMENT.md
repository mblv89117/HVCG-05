# Product AI Risk Assessment

**Date:** 2026-07-20
**Owner:** AI Governance Agent
**Collaborators required:** Security Engineering, System Architecture, QA, Capital/Finance product owners

## 1. Risk rating scale

| Level | Meaning |
|-------|---------|
| Critical | Client, capital, financial, legal, or external-send harm if misused |
| High | Material business error or privacy exposure likely without controls |
| Medium | Process/quality failure; limited blast radius if gated |
| Low | Cosmetic or internal hygiene |

## 2. Risk register (product AI)

| ID | Risk | Level | Modules | Current control | Residual | Required action |
|----|------|-------|---------|-----------------|----------|-----------------|
| R-AI-01 | Ungrounded figures presented as fact | Critical | Executive, Finance, Capital, Revenue | Copilot “not in source”; matrix | High | Enforce SourceRefs + GroundingStatus; reject Ungrounded for $ outputs |
| R-AI-02 | Autonomous external email/send | Critical | CRM, Portal-adjacent | ExternalSendBlocked on jobs; approval matrix | High | Block on draft-email queue; no portal generative send |
| R-AI-03 | Capital package draft treated as advice | Critical | Capital | Human approval matrix | High | Capital disclaimer + Advisor/Owner Accept required |
| R-AI-04 | EVA / enterprise-value treated as appraisal | Critical | Capital, Revenue | EVA is non-AI today | Medium | If AI assists, mandatory EVA disclaimer; never overwrite verified ranges silently |
| R-AI-05 | Financial recommendation without analyst review | Critical | Finance, Executive | Approval matrix | High | Finance disclaimer + dual review for material $ |
| R-AI-06 | Cross-client context leakage | Critical | All client-scoped | ClientCode + context policy | Medium | Authorization filter before retrieval and before display |
| R-AI-07 | Prompt injection via docs/notes | High | Knowledge, Ops, Capital | Security model guidance | Medium | Untrusted-content handling; tool deny for send |
| R-AI-08 | Hallucinated tasks/actions create work noise | Medium | Ops, Executive | SuggestedActions approval default | Medium | Accept required before task conversion |
| R-AI-09 | SOP draft published without Ops review | High | Ops Hub, Knowledge | Publish approval rule | Medium | Hard gate on promote-to-SOP |
| R-AI-10 | Missing AI-generated labeling | High | Most queues | Deliverables.AIGenerated only | High | Insight metadata on all outputs |
| R-AI-11 | Confidence absent → false certainty | High | Most queues | Confidence on Jobs/Outputs/Reviews only | High | Confidence + VerificationStatus everywhere |
| R-AI-12 | Silent overwrite of verified CRM/finance data | Critical | Revenue, Finance, Capital | Process intent | Medium | MayOverwriteVerifiedData=false; no AI patch of SoR fields |
| R-AI-13 | Client Portal AI without disclosure | Critical | Portal | No portal AI exists | Low (today) | Any future portal AI blocked until disclosure + sign-off |
| R-AI-14 | PBI Copilot misread of financial measures | Medium | Finance, Executive | Naming guidance | Medium | Treat answers as informational; no auto actions |
| R-AI-15 | Deterministic briefs mislabeled as AI | Low | Executive | Inventory distinguishes N-01/N-02 | Low | Keep labeling accurate |
| R-AI-16 | Reviewer not assigned on required outputs | High | All gated | Reviewer email fields exist | Medium | Block Approve if reviewer missing when required |

## 3. Module risk notes

### Executive Briefing implementation

**Strengths:** Field allow-list, banned sensitive content, “not in source”, P6 review banner, no auto-send.
**Gaps:** No structured SourceRefs/Confidence on brief artifact; relies on Copilot ACLs; generative review queue incomplete vs prompt library.
**Verdict:** Safe for **internal Copilot-assisted** use with Owner review for external. Not approved as autonomous generative release.

### Finance Intelligence implementation

**Strengths:** Financial analysis always human-reviewed in matrix.
**Gaps:** No dedicated finance AI feature/worker; risk is future feature creep and PBI Copilot figure misuse.
**Verdict:** No Production finance generative AI to sign off; any new feature must meet release criteria + FIN disclaimer.

### Client-facing AI functionality

**Strengths:** Portal has no generative AI; draft emails default to human approval.
**Gaps:** Draft-email path is client-facing once sent; disclosure language not wired into queue UI.
**Verdict:** Client-facing generative AI **not approved** for Production. Approved path = human-edited send with disclosure if AI drafted.

## 4. Abuse cases to test (QA)

1. Document instructs model to “send email now” / “ignore policy”.
2. Job for Client A retrieves Client B data.
3. Capital package invents TargetAmount not in source.
4. Suggested action converts to task without Accept.
5. SOP promote overwrites published SOP.
6. EVA AI assist presented without disclaimer.
7. Output Approved while GroundingStatus=Ungrounded and OutputClass=ActionableRecommendation.

## 5. Residual risk statement

Even with controls, generative models can err. HVCG treats AI as **assistive**. Business, capital, financial, legal, and client commitments remain human accountability.

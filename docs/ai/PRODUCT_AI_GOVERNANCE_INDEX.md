# Product AI Governance — Index

**Owner:** AI Governance Agent
**Audience:** Security Engineering, System Architecture, QA, product owners
**Scope:** Product AI only (Executive, Finance, Revenue, Operations, Knowledge, Client Portal, Capital)
**Out of scope:** Atlas Runtime, cloud-agent, dispatcher, orchestration engines, API-key/keychain, ATLAS-R

## Deliverables

| Document | Purpose |
|----------|---------|
| [AI_FEATURE_INVENTORY.md](AI_FEATURE_INVENTORY.md) | Audit of current product AI features |
| [AI_INSIGHT_METADATA.md](AI_INSIGHT_METADATA.md) | Required metadata on every AI output |
| [AI_RISK_ASSESSMENT.md](AI_RISK_ASSESSMENT.md) | Ungrounded/unsafe output risks |
| [AI_GOVERNANCE_MATRIX.md](AI_GOVERNANCE_MATRIX.md) | Automation vs approval by action |
| [AI_INTERACTION_PATTERNS.md](AI_INTERACTION_PATTERNS.md) | Approved patterns and prohibited behaviors |
| [AI_REVIEW_APPROVAL_RULES.md](AI_REVIEW_APPROVAL_RULES.md) | Accept / reject / dismiss + review rules |
| [AI_AUDIT_REQUIREMENTS.md](AI_AUDIT_REQUIREMENTS.md) | Audit and retention requirements |
| [AI_CLIENT_DISCLOSURE.md](AI_CLIENT_DISCLOSURE.md) | Client-facing disclosure language |
| [AI_RELEASE_SIGNOFF.md](AI_RELEASE_SIGNOFF.md) | Production-release acceptance criteria |
| [AI_GOVERNANCE_INTEGRATION_REPORT.md](AI_GOVERNANCE_INTEGRATION_REPORT.md) | Production integration verification + Master PM notification |
| [AI_GOVERNANCE.md](AI_GOVERNANCE.md) | Platform principles (existing) |
| [AI_APPROVAL_MATRIX.md](AI_APPROVAL_MATRIX.md) | Output-type approval matrix (existing) |
| [AI_CONTEXT_POLICY.md](AI_CONTEXT_POLICY.md) | Context assembly and isolation (existing) |
| [AI_SECURITY_MODEL.md](AI_SECURITY_MODEL.md) | Threats and classification (existing) |

## Module review status

| Module | Audit status | Release posture |
|--------|--------------|-----------------|
| Executive Dashboard / Briefings / Intelligence | Reviewed | Copilot grounding allowed; generative queues not Production-autonomous |
| Finance Intelligence | Reviewed | No dedicated finance AI worker; financial outputs always human-reviewed |
| Revenue Systems | Reviewed | CRM Copilot metadata only; drafts require approval |
| Operations Hub | Reviewed | SOP drafts require Ops Manager before publish |
| Knowledge Platform | Reviewed | Extraction drafts require review before institutional publish |
| Client Portal | Reviewed | **No client-facing generative AI approved for Production** |
| Capital Advisory | Reviewed | Package/QC drafts require Capital Advisor ± Owner; disclaimers mandatory |

## Collaboration

- **Security Engineering:** prompt-injection, secrets, classification ceilings
- **System Architecture:** schema fields for insight metadata and source refs
- **QA:** release sign-off tests and hallucination/grounding checks
- **Product owners:** accept/reject/dismiss UX and reviewer assignment

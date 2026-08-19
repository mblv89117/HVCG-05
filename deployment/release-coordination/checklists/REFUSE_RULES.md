# Refuse-to-Deploy Rules

Release Deployment Coordinator **must refuse** any production (or Prod-bound) deployment when any rule matches.

| Code | Condition | Action |
|------|-----------|--------|
| REFUSE-QA-NOGO | QA status is NO-GO (or missing GO for this RC) | Block deploy; notify Master PM + QA |
| REFUSE-S0 | Any S0 defect open in RC scope | Block |
| REFUSE-S1 | Any S1 defect open in RC scope | Block |
| REFUSE-TS-BUILD | TypeScript build fails | Block; attach build log |
| REFUSE-RBAC | Role-based security incomplete | Block; require security-engineering clearance |
| REFUSE-PLACEHOLDER | Placeholder / stub screens remain | Block; return to elite-ui / owning track |
| REFUSE-FAKE-FINANCE | Fabricated financial data in RC | Block; finance-intelligence + data-engineering |

Additional standing rules:

- No self-approve / self-merge / self-release by Coordinator.
- No deploy until formal QA **GO**.
- Never use deprecated Azure subscription `866189c6-5aa0-4037-8094-05771caceb0d`.
- Do not bypass Entra, Dataverse, SharePoint, Power Platform, Teams, Graph, Outlook, OneDrive, or Azure security.

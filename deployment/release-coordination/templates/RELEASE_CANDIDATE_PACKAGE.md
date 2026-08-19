# Release Candidate Package Template

```yaml
releaseVersion: "RC-YYYY.MM.DD-N"   # or semver agreed with Master PM
commitSha: "<primary merge/integration SHA>"
additionalCommits: []
deploymentEnvironment: "atlas-dev-swa | azure-prod-foundations | power-platform-prod (OWNER GATED)"
azureSubscriptionId: "ebc84d85-b5ff-4c4b-add1-b0a8de31b319"
azureSubscriptionName: "HVCG Production"
producedAt: "ISO-8601"
producedBy: "deployment-manager"
qaStatus: "PENDING | GO | NO-GO"
coordinatorStatus: "DRAFT | READY_FOR_QA | BLOCKED"
tracksIncluded: []
migrationRequirements: |
  - none | list Dataverse/SharePoint/Azure steps
rollbackPlan: |
  - steps...
knownIssues: []
refuseGateResults:
  REFUSE-QA-NOGO: "PASS|FAIL"
  REFUSE-S0: "PASS|FAIL"
  REFUSE-S1: "PASS|FAIL"
  REFUSE-TS-BUILD: "PASS|FAIL|NOT_RUN"
  REFUSE-RBAC: "PASS|FAIL|NOT_RUN"
  REFUSE-PLACEHOLDER: "PASS|FAIL|NOT_RUN"
  REFUSE-FAKE-FINANCE: "PASS|FAIL|NOT_RUN"
deploymentChecklistPath: "deployment/release-coordination/checklists/DEPLOYMENT_READINESS_CHECKLIST.md"
orchestrationReleaseBoardRef: "PROJECT_ATLAS/ORCHESTRATION/releases/board.json"
notes: ""
```

Instantiate under `rc-packages/RC-<version>.md` + `.json`.

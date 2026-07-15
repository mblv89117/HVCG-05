# RISKS

| ID | Risk | Likelihood | Impact | Mitigation | Owner |
|----|------|------------|--------|------------|-------|
| R001 | SharePoint List scaling limits (>5k/500k) | M | H | Indexed columns; archive Alumni; Dataverse V2 trigger | Architect |
| R002 | Personal connection ownership breaks flows | H | H | Service account OA-005 | Admin |
| R003 | Accidental oversharing of client financials | M | H | Disable anon links; library ACLs; training | Owner/Admin |
| R004 | Incomplete document collection stalls capital | H | M | Reminder cadence + PM escalation | Ops |
| R005 | Manny alert fatigue | M | M | Executive escalation rules only | Architect |
| R006 | Premium feature creep | M | M | Licensing gate in DECISION_LOG | Architect |
| R007 | No tenant access delays go-live | H | M | Complete all repo artifacts first | Architect |
| R008 | Lookup column thresholds / deleted parent | M | M | Soft-delete flags; ClientCode denorm | Dev |
| R009 | Contractor lingering access | M | H | Expiration dates; quarterly review SOP | Admin |
| R010 | Sample/prod data mix-up | L | H | Separate Dev sites; naming | Admin |

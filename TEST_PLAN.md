# TEST PLAN — HVCG Command Center V1.1.0

## Scope

Validate deployable schemas, scripts, template expansion, automation logic, permissions model, intelligence layer, AI orchestration, backup/restore, operational health, and UI specs against FR IDs.

## Environments

- **Repo tests:** schema validation (automated below)  
- **Tenant Dev:** UAT with sample-data only  
- **Prod:** go-live checklist after owner approval  

## Test Suites

### TS-DATA Data foundation
| ID | Case | Expected |
|----|------|----------|
| TC-D01 | All list JSON load & required fields present | Pass schema validator |
| TC-D02 | ClientCode unique validation | Duplicate blocked or warned |
| TC-D03 | Lookup targets exist in index | All lookupList values resolve |
| TC-D04 | Folder list equals 00–23 (24 folders) | Match config |

### TS-INT Intelligence Layer (v1.1.0)
| ID | Case | Expected |
|----|------|----------|
| TC-I01 | HVCG_Relationships schema loads | Required fields present (RelationshipId, SourceEntityType, TargetEntityType, ClientCode, IsCrossClient) |
| TC-I02 | Create client-scoped relationship | ClientCode stamped; IsCrossClient=false |
| TC-I03 | Cross-client relationship blocked for non-Owner | App/flow rejects or hides |
| TC-I04 | Query catalog patterns resolve | Indexed views return expected rows |
| TC-I05 | Inactive relationship archival | Status=Inactive; excluded from active views |

### TS-AI AI Orchestration (v1.1.0)
| ID | Case | Expected |
|----|------|----------|
| TC-A01 | All 11 orchestration lists provision | AIWorkers, AIJobs, AIJobSteps, AIContext, AIPrompts, AIToolRegistry, AIOutputs, AIApprovals, AIFeedback, AIAuditLog, AICostTracking |
| TC-A02 | AIJob lifecycle | Created → Running → AwaitingReview → Approved/Rejected |
| TC-A03 | ExternalSendBlocked enforced | No auto-send on approval |
| TC-A04 | JobId linkage to specialized queue | AI_* queue item references AIJobs.JobId |
| TC-A05 | AIAuditLog records job events | Immutable audit trail |
| TC-A06 | AICostTracking records usage | Cost attributed to job |
| TC-A07 | AIContext policy scopes inputs | No cross-client context leakage |
| TC-A08 | Prompt injection resistance | Malicious input in context does not alter system prompt |

### TS-BKP Backup & Restore (v1.1.0)
| ID | Case | Expected |
|----|------|----------|
| TC-BK01 | Backup-HVCGOS.ps1 completes | Manifest written; list data exported |
| TC-BK02 | Restore-HVCGOS.ps1 WhatIf | Reports planned actions without mutation |
| TC-BK03 | RestoreData additive | Existing customer items preserved |
| TC-BK04 | Backup includes v1.1.0 lists | Relationships, AIJobs, OperationalAlerts in export |

### TS-MON Monitoring & Health (v1.1.0)
| ID | Case | Expected |
|----|------|----------|
| TC-M01 | Invoke-HVCGOSOperationalHealth.ps1 passes | Healthy on fresh install |
| TC-M02 | Missing list detected | OperationalAlert written |
| TC-M03 | Stale AI job detected | Warning alert |
| TC-M04 | System Health Dashboard measures | FactOperationalAlert, FactAIJob resolve |

### TS-ONBOARD Onboarding
| ID | Case | Expected |
|----|------|----------|
| TC-O01 | Set client Active Client | Engagement, project, docs, tasks, milestones created |
| TC-O02 | Re-run onboarding | Idempotent skip; log SkippedDuplicate |
| TC-O03 | Workspace folders | 24 folders present |
| TC-O04 | Library ACL | Unrelated contractor cannot open library |

### TS-PROJ Projects
| ID | Case | Expected |
|----|------|----------|
| TC-P01 | Instantiate each of 18 templates | Tasks/docs/deliverables > 0 |
| TC-P02 | Role default owners resolved | OwnerEmail populated when team list present |
| TC-P03 | Dependencies recorded | DependsOnTaskKeys set |

### TS-DOC Documents
| ID | Case | Expected |
|----|------|----------|
| TC-R01 | Reminder cadence | ReminderCount increments on schedule days |
| TC-R02 | Day 14 escalation | EscalationStatus=PM; Manny not emailed |
| TC-R03 | Rejected requires resubmission | Status path works |

### TS-SEC Security
| ID | Case | Expected |
|----|------|----------|
| TC-S01 | Contractor without client group | Access denied to library |
| TC-S02 | Finance fields | Hidden in app for Analyst |
| TC-S03 | Anonymous link | Blocked on clients site |
| TC-S04 | Guest to client A | Cannot see client B library |
| TC-S05 | AI lists internal-only | Guest/contractor cannot access AIJobs or AIApprovals |
| TC-S06 | Relationships client isolation | Contractor sees only assigned ClientCode edges |

### TS-ESC Executive
| ID | Case | Expected |
|----|------|----------|
| TC-E01 | Routine overdue low task | No executive mail |
| TC-E02 | Payment materially overdue flag | Executive notification |
| TC-E03 | Decision RequiresExecutiveAttention | Appears on exec home |

### TS-FIN Finance ops
| ID | Case | Expected |
|----|------|----------|
| TC-F01 | Past due nightly flag | IsPastDue true |
| TC-F02 | Renewal windows | Tasks at 60/30/14 |

### TS-UI App
| ID | Case | Expected |
|----|------|----------|
| TC-U01 | Ops assistant creates task on phone | Success |
| TC-U02 | Search client | Finds by name/code |
| TC-U03 | Executive empty state | Friendly message |

### TS-RPT Reporting
| ID | Case | Expected |
|----|------|----------|
| TC-B01 | Overdue Tasks measure | Matches list count |
| TC-B02 | Active retainers sum | Matches clients |

### TS-ERR Resilience
| ID | Case | Expected |
|----|------|----------|
| TC-X01 | Flow failure | AutomationLogs Failed + admin notify |
| TC-X02 | Missing template key | Graceful error |

### TS-UPG Upgrade (v1.1.0)
| ID | Case | Expected |
|----|------|----------|
| TC-U01 | Upgrade 1.0.0 → 1.1.0 | Additive lists/columns; customer data preserved |
| TC-U02 | InstalledVersion updated | HVCG_SystemInfo = 1.1.0 |
| TC-U03 | Soft rollback to 1.0.0 | Version flag resets; new schema remains |

## Exit criteria for v1.1.0 test complete

- Schema validator green (81 lists)  
- Repo tests: `tests/intelligence/test_intelligence_ai_backup.py` PASS  
- Dev tenant: TC-I01, A01, BK01, M01, U01 (upgrade path), O01, O02, O04, P01 (spot check 3 templates), R02, S01, S05, E01, E02 pass with evidence in TEST_RESULTS.md  
- Open defects severity Critical = 0  

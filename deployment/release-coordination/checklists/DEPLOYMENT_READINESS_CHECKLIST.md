# Project Atlas — Deployment Readiness Checklist

**Owner:** Release Deployment Coordinator (`deployment-manager`)  
**Rule:** **Do not deploy** until QA issues a formal **GO**.  
**Subscription (Azure Prod foundations):** `HVCG Production` `ebc84d85-b5ff-4c4b-add1-b0a8de31b319`  
**Never use:** `866189c6-5aa0-4037-8094-05771caceb0d`

---

## A. Engineering completion (tracked tracks)

| Track | Agent / signal | Ready? | Waiting Review / QA? | Notes |
|-------|----------------|--------|----------------------|-------|
| Elite UI | `elite-ui` | ☐ | ☐ | |
| Operations Hub | ops worktrees / tasks | ☐ | ☐ | |
| Revenue Systems | `revenue-systems` | ☐ | ☐ | |
| Client Portal | `client-workspace` | ☐ | ☐ | |
| Finance Intelligence | `finance-intelligence` | ☐ | ☐ | |
| Security | `security-engineering` | ☐ | ☐ | |
| Data Engineering | `data-engineering` | ☐ | ☐ | |

**Ready detection:** Orchestration task `status=Ready` **or** heartbeat action indicating Ready work complete and moved to `Waiting Review` / `QA Review` with acceptance criteria met.  
Coordinator treats **merge candidates** as tasks in `Waiting Review`, `QA Review`, `Approved`, or listed in `releases/merge-queue.json`.

---

## B. Hard refuse gates (any FAIL = NO DEPLOY)

| ID | Gate | Pass criteria |
|----|------|---------------|
| R1 | QA formal GO | Explicit GO from `qa-release` for this RC version |
| R2 | QA NO-GO | Absent / not set |
| R3 | S0 defects | Count = 0 |
| R4 | S1 defects | Count = 0 |
| R5 | TypeScript build | `npm`/`pnpm` build exit 0 for Elite OS (and any TS apps in RC) |
| R6 | Role-based security | RBAC / security matrix complete for in-scope surfaces |
| R7 | Placeholder screens | No TODO/placeholder/lorem production UI in RC scope |
| R8 | Fabricated financial data | No fake $ / fabricated finance figures in Prod-bound paths |

---

## C. Platform & environment

| ID | Check | Pass |
|----|-------|------|
| E1 | Target environment named (Dev SWA / Azure / PP) | ☐ |
| E2 | Correct Azure subscription | ☐ |
| E3 | Entra / Dataverse / SharePoint / PP security not bypassed | ☐ |
| E4 | Key Vault / secrets not in git | ☐ |
| E5 | Migration requirements documented | ☐ |
| E6 | Rollback plan attached | ☐ |
| E7 | Monitoring / App Insights plan | ☐ |

---

## D. Release candidate package

| ID | Artifact | Pass |
|----|----------|------|
| P1 | `release-version` | ☐ |
| P2 | `commit-sha`(s) | ☐ |
| P3 | `deployment-environment` | ☐ |
| P4 | `migration-requirements` | ☐ |
| P5 | `rollback-plan` | ☐ |
| P6 | `known-issues` | ☐ |
| P7 | This checklist completed for RC | ☐ |
| P8 | Master PM notified | ☐ |
| P9 | QA coordinated / GO recorded | ☐ |

---

## E. Sign-off (all three required before deploy)

| Role | Name | Date | Decision |
|------|------|------|----------|
| Release Deployment Coordinator | | | READY_FOR_QA / BLOCKED |
| QA | | | **GO** / NO-GO |
| Master PM | | | **APPROVED** / REJECTED |
| Owner | | | **APPROVED** / REJECTED |

**Deployment permitted only when:** QA = **GO** **and** Master PM = **APPROVED** **and** Owner = **APPROVED** **and** all refuse gates PASS.

**Never auto-deploy.** Human execution only after the three approvals.

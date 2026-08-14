# DECISION HISTORY

Version: 1.0

Status: Active

Authority: High Value Capital Group LLC

---

# Purpose

This document records significant architectural, engineering, operational, and business decisions made throughout the development of the High Value Capital Group Operating System.

The purpose is to preserve institutional knowledge.

Future engineers should understand WHY a decision was made before deciding to change it.

This document prevents repeated debates and unnecessary redesign.

---

# Decision Format

Every new decision should follow this format.

---

Decision ID

Date

Decision Owner

Category

Status

Context

Decision

Alternatives Considered

Reasoning

Tradeoffs

Impact

Dependencies

Implementation Notes

Can This Be Revisited?

Related Change Requests

Related Releases

---

# STATUS VALUES

Proposed

Approved

Implemented

Deprecated

Replaced

Rejected

---

# CATEGORY VALUES

Architecture

Infrastructure

CRM

Revenue

Client Portal

Executive Command Center

Finance

Operations

Deployment

Security

Documentation

Project Management

AI

Business

Other

---

# INITIAL PROJECT DECISIONS

--------------------------------------------------

Decision ID

DEC-0001

Category

Architecture

Status

Implemented

Decision

Project Atlas is the permanent institutional memory.

Reason

Repository documentation is more reliable than conversation history.

Impact

All engineers and AI agents must read and update Project Atlas.

Can Be Revisited

No

--------------------------------------------------

Decision ID

DEC-0002

Category

Engineering

Status

Implemented

Decision

Every major subsystem is owned by a dedicated engineering agent.

Reason

Clear ownership reduces conflicts and improves quality.

Impact

Agents work independently using isolated worktrees.

Can Be Revisited

Only through Change Request.

--------------------------------------------------

Decision ID

DEC-0003

Category

Source Control

Status

Implemented

Decision

Every sprint uses its own worktree and branch.

Reason

Isolation prevents accidental regressions.

Impact

Safer parallel development.

--------------------------------------------------

Decision ID

DEC-0004

Category

Deployment

Status

Implemented

Decision

Production remains frozen unless explicitly approved.

Reason

Protect live business operations.

Impact

No direct production development.

--------------------------------------------------

Decision ID

DEC-0005

Category

Documentation

Status

Implemented

Decision

Documentation is considered part of the product.

Reason

Institutional knowledge must survive personnel and AI changes.

Impact

Every sprint updates Project Atlas.

--------------------------------------------------

Decision ID

DEC-0006

Category

Project Management

Status

Implemented

Decision

Completed work is modified only through Change Requests.

Reason

Maintain stability while allowing controlled evolution.

Impact

Every change receives impact analysis before implementation.

--------------------------------------------------

Decision ID

DEC-0007

Category

AI

Status

Implemented

Decision

AI engineers are treated as engineering team members.

Reason

Consistent ownership and accountability.

Impact

AI produces code, tests, documentation, and handoffs.

--------------------------------------------------

Decision ID

DEC-0008

Category

Business

Status

Implemented

Decision

Business value takes priority over technical novelty.

Reason

Technology exists to improve HVCG.

Impact

Every feature should increase enterprise value, reduce owner workload, improve scalability, or improve client experience.

---

# FUTURE DECISIONS

Every future architectural decision should be appended below.

Never delete historical decisions.

If a decision changes:

Mark the original as:

Replaced

Then reference the new Decision ID.

Decision history must remain chronological.

--------------------------------------------------

Decision ID

DEC-0009

Date

2026-08-14

Decision Owner

Manny Barela / High Value Capital Group LLC

Category

Architecture

Status

Approved

Context

HVCG Master Architecture Audit Gate 11 final closure. Older Atlas status files still described Dynamics Track-1 as current production SoR.

Decision

The audit finish line is architecture cleanliness, security/SoR, seven-system ownership, governed Atlas production, and a documented duplicate-infra retirement path. Commercial product launches are after the audit. Duplicate-infra retirement must not be executed in Gate 11.

Alternatives Considered

Keep the audit open until every commercial product is launched.

Reasoning

Architecture audit and commercial launch are different programs.

Can This Be Revisited?

Only through a new owner decision. Do not reopen to force commercial launches into the audit.

Related Change Requests

Gate 11 Final Closure

--------------------------------------------------

Decision ID

DEC-0010

Date

2026-08-14

Decision Owner

Manny Barela / High Value Capital Group LLC

Category

Architecture

Status

Approved

Context

Growth Command Center had been described as internal/commercial operations tooling.

Decision

GCC is a commercial CFO / financial-intelligence product with its own application and data boundary. HVCG may use GCC as a customer/tenant. GCC is not HVCG's internal accounting system.

Can This Be Revisited?

Only through a new owner decision.

Related Change Requests

Gate 11 Final Closure

--------------------------------------------------

Decision ID

DEC-0011

Date

2026-08-14

Decision Owner

Manny Barela / High Value Capital Group LLC

Category

CRM

Status

Approved

Context

July 2026 Atlas status treated Dynamics CRM as production SoR. Live Hub production PM is SharePoint via managed identity.

Decision

Atlas / HVCG OS Version 1 system of record is SharePoint `HVCG_*` for CRM, clients/prospects, projects, tasks, HVCG finance operations, and related internal operating records. Do not initiate a Dynamics or Dataverse migration.

Alternatives Considered

Migrate to Dynamics/Dataverse as Atlas V1 SoR.

Reasoning

No business case currently justifies Dynamics/Dataverse. Live production PM is SharePoint.

Can This Be Revisited?

Yes, only when a future business case justifies it. Not an Atlas V1 task.

Related Change Requests

Gate 11 Final Closure

--------------------------------------------------

Decision ID

DEC-0012

Date

2026-08-14

Decision Owner

Manny Barela / High Value Capital Group LLC

Category

Security

Status

Implemented

Context

G11-F03: seven `HVCG-Client-*` groups existed and were empty. Membership provisioning required explicit business authorization.

Decision

Immediate production client access is Manny only across HVCG-Client-ACCG01, CCB01, CPL01, HFD01, KAVA01, LIEN01, and PDG01. Do not infer or add any other user. Employee-to-client roster requires a later owner approval.

Implementation Notes

Entra object `e4835ea2-3c45-493a-95f5-472f6339661d` (`manny@highvaluecapitalgroup.com`) added as the sole direct member of all seven groups on 2026-08-14.

Can This Be Revisited?

Yes, only with an explicit owner-approved roster. Do not infer.

Related Change Requests

G11-F03

--------------------------------------------------

Decision ID

DEC-0013

Date

2026-08-14

Decision Owner

Manny Barela / High Value Capital Group LLC

Category

Architecture

Status

Approved

Context

Client 360 entities are keyed by ingest-time UUIDs. No trusted source-container → ClientCode mapping exists. Routes fail closed.

Decision

Client 360 mapping is not a blocker to completion of the core architecture audit. Record as CLIENT 360 MAPPING — POST CORE AUDIT DEFERRED BACKLOG. Do not invent mappings. Do not weaken fail-closed behavior.

Can This Be Revisited?

Yes, as a post-audit feature/integration gate only.

Related Change Requests

Gate 11 Final Closure / Client 360 defer

---

# RULES

Never rewrite history.

Never delete decisions.

Never modify historical reasoning.

Always preserve context.

Institutional memory is one of the company's most valuable assets.

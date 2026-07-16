# DECISION HISTORY

Version: 2.0

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

Decision ID

DEC-0009

Date

2026-07-16

Decision Owner

HVCG Owner

Category

Documentation

Status

Replaced

Context

New ChatGPT conversations were spending time rebuilding and summarizing context already recorded in Project Atlas.

Decision

Continuation Framework V2 uses six portable continuation documents as the authoritative conversation memory: START_HERE, CHATGPT_CONTINUATION_PROMPT, PROJECT_PHILOSOPHY, DECISION_HISTORY, CURRENT_STATE, and ACTIVE_SPRINT.

Reasoning

A new session must resume execution immediately when instructed to continue Project Atlas.

Impact

Future sessions read all six documents, skip project reconstruction and status summaries, and continue from ACTIVE_SPRINT.

Can This Be Revisited?

Only through an approved Project Atlas documentation change.

Replaced By

DEC-0012

--------------------------------------------------

Decision ID

DEC-0010

Date

2026-07-16

Decision Owner

HVCG Owner

Category

Project Management

Status

Implemented

Context

Stable principles and historical decisions change slowly, while live project and sprint facts change frequently.

Decision

Continuation V2 separates live memory into CURRENT_STATE.md and ACTIVE_SPRINT.md. CURRENT_STATE is updated after every completed sprint or control-point change. ACTIVE_SPRINT is updated whenever the execution point changes.

Reasoning

Separating durable guidance from frequently changing state makes continuation faster and reduces stale or conflicting instructions.

Impact

Master PM must keep both live files synchronized with authoritative Atlas and Git evidence.

Can This Be Revisited?

Yes, through an approved Atlas architecture decision.

--------------------------------------------------

Decision ID

DEC-0011

Date

2026-07-16

Decision Owner

HVCG Owner

Category

Source Control

Status

Implemented

Context

The continuation framework was initially committed on the agent communications branch and needed a protected Atlas authority separate from application and specialist workstreams.

Decision

`cursor/project-atlas-rc1` is the authoritative RC-1 Project Atlas branch. Shared Atlas integration and continuation updates are coordinated there by the Master PM.

Reasoning

A dedicated Atlas branch protects institutional memory from unrelated application and workstream changes.

Impact

Specialist branches propose Atlas updates through handoffs. They do not supersede the authoritative Atlas branch.

Can This Be Revisited?

Yes, when a later authoritative Atlas release branch is explicitly approved and recorded.

---

Decision ID

DEC-0012

Date

2026-07-16

Decision Owner

HVCG Owner

Category

Documentation

Status

Implemented

Context

The six-document Continuation Framework V2 defined authoritative memory but did not define one controlling startup workflow.

Decision

Continuation Framework V2 is workflow-driven. `STARTUP_SEQUENCE.md` is the authoritative continuation workflow and expands the upload set to seven documents. `START_HERE.md` delegates startup execution to that workflow.

Reasoning

One explicit execution sequence prevents alternate reading orders, duplicated startup logic, context reconstruction, and unnecessary owner questions.

Impact

Every future ChatGPT session executes STARTUP_SEQUENCE before responding, validates continuation consistency, enters Continuation Mode, and resumes ACTIVE_SPRINT immediately.

Can This Be Revisited?

Only through an approved Project Atlas documentation change.

---

# FUTURE DECISIONS

Every future architectural decision should be appended below.

Never delete historical decisions.

If a decision changes:

Mark the original as:

Replaced

Then reference the new Decision ID.

Decision history must remain chronological.

---

# RULES

Never rewrite history.

Never delete decisions.

Never modify historical reasoning.

Always preserve context.

Institutional memory is one of the company's most valuable assets.

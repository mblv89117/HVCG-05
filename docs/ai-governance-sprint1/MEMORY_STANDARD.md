# Project Atlas Agent Memory Standard

**Memory owner:** Documentation and Knowledge Manager
**Governance owner:** AI Governance Manager
**System of record:** Project Atlas and approved repositories

## 1. Principle

Agent memory is not automatically authoritative. Durable knowledge must be purposeful, provenance-backed, classified, reviewable, correctable, and owned by a human role.

Project Atlas is the institutional memory. Chat history and model recollection are convenience context only.

## 2. Memory classes

| Class | Purpose | Lifetime | Authority |
|-------|---------|----------|-----------|
| Session context | Current interaction and tool results | Session | Non-authoritative |
| Working memory | Active assignment plan/state | Assignment | Non-authoritative until evidenced |
| Episodic record | What happened in a task/sprint | Retention policy | Audit/handoff evidence |
| Semantic memory | Approved facts, standards, architecture | Until reviewed/superseded | Project Atlas |
| Procedural memory | Approved workflow, prompt, runbook | Versioned | Approved artifact |
| Prohibited memory | Secrets, unnecessary sensitive data, hidden reasoning | Never | Must not persist |

## 3. Required memory record

Durable memory includes:

- Memory ID;
- title and summary;
- type;
- source/evidence references;
- author Agent ID and human owner;
- created/verified dates;
- data classification;
- client/tenant scope when applicable;
- confidence;
- status;
- effective/expiry/review dates;
- related policy/prompt/version;
- supersedes/superseded-by references;
- access policy;
- redaction status;
- correction history.

## 4. Memory lifecycle

```text
Observed → Proposed → Reviewed → Approved → Active
                                      ├── Corrected
                                      ├── Superseded
                                      ├── Expired
                                      └── Deleted under policy
```

Only Approved/Active memory can be treated as institutional fact.

## 5. Admission criteria

Store durable memory only when it is:

- relevant to future authorized work;
- supported by authoritative evidence;
- not already represented by a canonical record;
- assigned to a human owner;
- classified and access-controlled;
- free of secrets and unnecessary personal/client data;
- written as a concise fact, decision, runbook, or handoff;
- given a review/expiry date.

## 6. Prohibited memory

Never persist:

- passwords, tokens, private keys, cookies, or connection strings;
- hidden chain-of-thought or private model reasoning;
- raw client content not needed as a record;
- unsupported inference presented as fact;
- personal data outside an approved purpose;
- cross-client context;
- obsolete instructions without status;
- approval claims without decision evidence;
- copied web content as authoritative policy;
- transient tool noise.

Store conclusions, evidence, decisions, and concise rationale—not hidden internal reasoning.

## 7. Source hierarchy

For conflicts, prefer:

1. current human Owner decision;
2. current approved Project Atlas record;
3. current approved governance policy;
4. signed/approved release, security, legal, or financial record;
5. repository state and test evidence;
6. approved handoff/audit event;
7. agent report;
8. conversation history or model recollection.

Conflicting records are flagged; they are not silently merged.

## 8. Context assembly

Before adding memory to a session:

1. verify Agent and Assignment;
2. identify task and minimum required facts;
3. enforce role/resource/data access;
4. filter client/tenant scope;
5. include canonical records before summaries;
6. attach provenance and version;
7. mark stale, disputed, or inferred content;
8. stay within context and cost budgets.

## 9. Confidence

| Confidence | Meaning | Allowed use |
|------------|---------|-------------|
| Verified | Human-approved authoritative evidence | Operational fact |
| High | Multiple consistent primary sources | Use with citation |
| Medium | Single credible source | Validate before high-impact use |
| Low | Agent inference or incomplete evidence | Do not treat as fact |
| Disputed | Conflicting evidence | Stop relevant high-impact action |

Confidence never replaces permission or human approval.

## 10. Corrections and conflicts

When memory is wrong or stale:

1. preserve original record;
2. create correction/superseding record;
3. link both records;
4. state changed facts and evidence;
5. update status;
6. notify affected owners/agents;
7. identify decisions influenced by the old record;
8. audit the correction.

Do not rewrite history silently.

## 11. Handoff memory

Every handoff captures:

- Agent/Assignment IDs;
- objective and scope;
- branch/worktree/base;
- files changed;
- commit/push/merge state;
- tests and results;
- decisions and approvals;
- blockers and risks;
- dirty/untracked work;
- rollback/recovery path;
- required Atlas updates;
- next owner and requested action.

## 12. Retention and deletion

| Memory | Default |
|--------|---------|
| Session context | Discard at session end |
| Working memory | Discard after verified handoff/completion |
| Sprint handoff | Retain at least 3 years |
| Architecture/policy/decision | Retain while effective plus history |
| Incident/Production/financial decision | Follow audit/legal retention |
| Superseded memory | Retain historical version |

Deletion requires retention eligibility, legal-hold check, owner authorization where applicable, and an audit event.

## 13. Privacy and client boundaries

- client-specific memory carries explicit client/tenant scope;
- generic lessons must be de-identified before reuse;
- retrieval filters apply before content enters model context;
- Restricted data requires explicit data-owner approval;
- memory exports are purpose-bound and audited.

## 14. Memory quality review

Review:

- provenance resolves;
- owner remains valid;
- review date is current;
- facts match current system/repository;
- classification/access remain correct;
- no secret or unnecessary data exists;
- conflicts and supersession links are complete;
- downstream prompts/runbooks reference the active version.

## 15. Recovery

If context or memory is suspected to be corrupted:

1. stop affected work;
2. isolate the suspect record;
3. reconstruct from authoritative Project Atlas and repository evidence;
4. start a clean session;
5. validate ownership, prompt, permission, and branch/worktree;
6. correct/supersede the record;
7. assess affected actions;
8. obtain approval before resuming high-impact work.

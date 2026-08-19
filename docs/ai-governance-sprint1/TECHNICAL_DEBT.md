# AI Governance Framework — Technical Debt

**Scope:** Known gaps between the documented governance design and enforceable operation

## Priority debt

| ID | Debt | Priority | Consequence | Exit criterion |
|----|------|----------|-------------|----------------|
| TD-01 | Governance rules are not machine-enforced | Critical | Agents may rely on prompt compliance | Independent policy enforcement blocks denied actions |
| TD-02 | Registry and approval data are mock/in-memory | Critical | Identity and decisions are not durable | Versioned persistent schemas and access controls |
| TD-03 | No trusted identity binding | Critical | Agent/human attribution can be spoofed | Verified identity maps to Agent/Assignment/Session |
| TD-04 | No append-only audit sink | Critical | Events can be missing or mutable | Durable write path, integrity verification, reconciliation |
| TD-05 | Tool capability tokens are unspecified | High | Tool access can exceed assignment | Short-lived scoped capability contract |
| TD-06 | No ownership/collision service | High | Parallel branches/worktrees can conflict | Registry/lock interface with stale-lock recovery |
| TD-07 | No context authorization service | High | Cross-client or excess retrieval risk | Retrieval policy enforces role, client, classification |
| TD-08 | Prompt test suite is conceptual | High | Unsafe prompt versions may be promoted | Automated scenario/adversarial qualification |
| TD-09 | No model qualification baseline | High | Provider/model changes can regress controls | Per-model compatibility evidence |
| TD-10 | Retention schedule is provisional | High | Legal/privacy conflict | Qualified policy approval |
| TD-11 | Cost metrics are mocked | Medium | Budget controls cannot stop runaway usage | Trusted usage interface and thresholds |
| TD-12 | Dashboard freshness semantics are not implemented | Medium | Executives may trust stale data | Source timestamp, evidence class, freshness SLO |
| TD-13 | Policy documents overlap earlier Sprint 1 summaries | Medium | Drift or contradictory guidance | Approve canonical set and deprecate superseded docs |
| TD-14 | No automated cross-document consistency check | Medium | Role/action definitions can diverge | Governance documentation schema/linter |
| TD-15 | No incident/recovery exercises | Medium | Runbooks may fail under pressure | Tabletop and technical recovery drills |

## Documentation debt

- assign final named human owners and delegates;
- confirm role names against current Atlas operating model;
- approve a canonical glossary;
- define legal hold and deletion authority;
- define data classifications against HVCG policy;
- specify emergency approval authority;
- define dashboard metric formulas and service levels;
- map each rule to an acceptance test;
- mark older governance documents as active, superseded, or historical after QA.

## Debt management rules

1. Critical debt blocks Production enforcement claims.
2. Debt has an owner, target sprint, and acceptance criterion before implementation.
3. A mock adapter cannot be represented as a live control.
4. Other-track debt becomes an interface requirement, not a cross-workspace edit.
5. Closing debt requires evidence and independent QA.

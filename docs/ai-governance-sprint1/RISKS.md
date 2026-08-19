# AI Governance Framework — Risks

**Status:** Proposed risk register for QA and Owner review
**Rating model:** Likelihood and impact are qualitative until telemetry exists.

## Open risks

| ID | Risk | Likelihood | Impact | Current control | Required disposition |
|----|------|------------|--------|-----------------|----------------------|
| R-01 | Documentation is mistaken for enforced security | High | Critical | Explicit documentation-only status | Label all runtime surfaces; require implementation assurance |
| R-02 | Human approval language is ambiguous | Medium | High | Approval specificity rules | Implement structured approval objects and tests |
| R-03 | Stable identity cannot be cryptographically verified | High | High | Proposed Agent/Assignment/Session IDs | Integrate trusted identity provider through interface |
| R-04 | Audit records could be altered or omitted | High | High | Append-only and integrity requirements | Implement durable audit sink and reconciliation |
| R-05 | Prompt injection bypasses intended behavior | Medium | Critical | Instruction precedence and tool enforcement rules | Add adversarial tests and independent policy enforcement |
| R-06 | Cross-client context or memory leakage | Medium | Critical | Client scope, minimum context, classifications | Implement authorization-filtered retrieval |
| R-07 | Secrets enter prompts, logs, screenshots, or memory | Medium | Critical | Secret prohibition and incident procedure | Add pre/post-processing secret detection |
| R-08 | Permission drift expands agent authority | Medium | High | Version binding, expiry, revocation | Implement policy decision service and periodic review |
| R-09 | Parallel agents collide on paths or branches | Medium | High | Dedicated worktrees and ownership escalation | Implement collision registry/lock interface |
| R-10 | Unsafe retries duplicate side effects | Medium | Critical | Operation-specific no-retry and idempotency rules | Implement idempotency and outcome reconciliation |
| R-11 | Governance dashboard displays stale/self-reported data | High | Medium | Fact/evidence/staleness distinctions | Establish trusted telemetry contracts |
| R-12 | Cost controls lack live usage data | High | Medium | Proposed budgets and thresholds | Add mocked contract, then approved billing adapter |
| R-13 | Retention conflicts with legal/privacy duties | Medium | High | Provisional retention schedule | Obtain legal/privacy review |
| R-14 | Segregation of duties fails in a small team | Medium | High | No self-approval baseline | Define named delegates and emergency process |
| R-15 | Model/provider changes alter safety behavior | Medium | High | Compatibility and promotion tests | Build model qualification suite |
| R-16 | Recovery actions overwrite parallel work | Low | High | Non-destructive recovery and dedicated worktrees | QA recovery drills |
| R-17 | External track interfaces are undefined | High | Medium | Additive/interface-only rule | Publish versioned interface specifications |

## Protected-boundary risk

The governance framework references other tracks only to define constraints and future interfaces. It does not authorize AI Governance to modify those tracks. Any future integration must be:

1. documented as an interface specification;
2. accepted by the owning track;
3. mocked in AI Governance until approved;
4. independently tested;
5. activated through human approval.

## Residual risk

Even after implementation, model behavior remains probabilistic. Security must rely on deterministic identity, authorization, data, tool, approval, and audit controls outside the model.

## QA disposition

QA should mark each risk:

- Accepted;
- Mitigated;
- Requires change;
- Deferred with owner/date;
- Blocker.

Critical risks cannot be silently deferred.

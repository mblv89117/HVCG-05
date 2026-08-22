# Screen: Ask Atlas (scrAskAtlas)

**App:** HVCG_ProjectCommandCenter  
**Audience:** signed HVCG operators only; hidden from Contractor and Client Contact  
**Purpose:** conversational operating interface for grounded HVCG intelligence

## Jobs to be done

1. Ask what needs attention, what changed, what is overdue, what is blocked, or
   which decisions require Manny.
2. Ask client-specific questions without needing to know list names or source
   systems.
3. See provenance and evidence classification in plain business language.
4. Create proposed internal actions or engineering missions when policy allows.
5. Review prior Ask Atlas activity without exposing raw infrastructure details.

## Data sources

| List | Purpose |
| --- | --- |
| `HVCG_AskAtlasSessions` | conversation state and grounded answer summary |
| `HVCG_AgentEvents` | event-driven signals that can trigger Ask Atlas context |
| `HVCG_AgentActivity` | activity ledger and audit trail |
| `HVCG_AIToolRegistry` | governed tool permission classes |
| `HVCG_AIJobs` | execution/run records for longer agent work |
| `HVCG_AIOutputs` | approved or pending outputs |
| `HVCG_EngineeringMissions` | product-improvement missions routed to V4 |

Supporting read-only context comes from existing operational lists:
`HVCG_Clients`, `HVCG_Projects`, `HVCG_Tasks`, `HVCG_DocumentRequests`,
`HVCG_Decisions`, `HVCG_Risks`, `HVCG_Issues`, `HVCG_Opportunities`,
`HVCG_CapitalOpportunities`, `HVCG_Relationships`, and
`HVCG_OperationalAlerts`.

## Layout

```text
Header: Ask Atlas | scope selector | client selector | activity link
Main:
  Left rail: starter prompts + active attention filters
  Center: conversation transcript + answer cards
  Right rail: evidence, policy, proposed actions, related missions
Footer: input box + send + "create proposed action" / "create engineering mission"
```

## Controls

| Control | Behavior |
| --- | --- |
| `ddAskScope` | OperatorPortfolio / AssignedClients / SingleClient / CapitalDesk / Engineering |
| `cmbAskClient` | Visible only when scope = SingleClient; filters by authorized `ClientCode` |
| `txtAskAtlas` | Natural-language operator question |
| `btnAskAtlasSend` | Creates/updates `HVCG_AskAtlasSessions`; invokes governed Ask Atlas API/flow |
| `galAskTranscript` | Shows questions and response summaries from `HVCG_AskAtlasSessions` |
| `galAskEvidence` | Shows human-friendly `EvidenceReferences` and classifications |
| `galAskActions` | Shows PROPOSED actions only until approved or converted |
| `btnCreateEngineeringMission` | Enabled only for product-improvement intent and governed technical write policy |

## Starter prompts

- What are the most important things I need to address right now?
- What is overdue?
- What is blocked?
- What decisions do I need to make?
- What Capital matters need attention?
- Why is this client blocked?
- What changed since yesterday?
- Make this screen more useful.

## Policy states

| State | UI behavior |
| --- | --- |
| `Allowed` | Show answer and evidence |
| `AllowedWithRedaction` | Show answer with redaction note |
| `ProposedOnly` | Badge as PROPOSED; do not write authoritative state |
| `ApprovalRequired` | Route to `HVCG_AIApprovals`; disable direct execution |
| `Denied` | Explain business-safe reason; do not retrieve or synthesize restricted data |

## Answer card requirements

Every material answer card shows:

- `OutputClassification`: `CONFIRMED`, `LIKELY`, `PROPOSED`,
  `STALE_OR_UNCERTAIN`, or `COMPLETE`;
- source label in human language;
- client/project/entity when applicable;
- "why this matters";
- "what can happen next";
- visible warning when evidence is missing or stale.

## Acceptance criteria

- Ask "What needs my attention?" returns ranked attention cards from authorized
  lists or an honest empty state.
- Single-client scope never returns another client's records.
- Owner-gated requests stop at approval/proposal.
- Every answer that invokes tools writes `HVCG_AgentActivity`.
- Engineering mission creation writes `HVCG_EngineeringMissions` with evidence,
  acceptance criteria, risk, affected repo/system, and rollback expectation.

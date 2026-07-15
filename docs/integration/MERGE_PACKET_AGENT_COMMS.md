# MERGE PACKET — Agent Communications Infrastructure (offline draft)

**Packet ID:** `MERGE-COMMS-001`  
**Prepared by:** Integration (`integration`) on `agent/crm-integration`  
**As of:** 2026-07-15  
**Owner gate:** **Awaiting owner D-003** (merge approval) — **do not merge until issued**  
**Deploy policy:** NO merges, NO deploys, NO Production from this packet alone

---

## Candidate

| Field | Value |
|-------|--------|
| Branch | `cursor/agent-communications` |
| Tip (infra COMPLETE) | `2c064b3` — `Add repository-backed inter-agent communications channel.` |
| Checkout note | MAIN worktree currently **on** `cursor/agent-communications` with **CRM dirty contamination** |
| Ready signal | Master READY queue: agent-comms infra = READY FOR INTEGRATION |
| Protocol SoR | `docs/agents/AGENT_COMMUNICATIONS.md`, `MESSAGE_PROTOCOL.md`, `FILE_LOCK_PROTOCOL.md` |
| Bus root | `.agent-comms/` (single bus — do not fork) |
| CLI | `scripts/agent-comms/` |

---

## Preconditions (all required before D-003 execution)

1. Owner issues **D-003** for this packet (`MERGE-COMMS-001`) explicitly.
2. **CRM dirty MAIN segregation complete** — working tree must not mix CRM Maker OA / solution / acceptance WIP into the comms release commit or PR.
3. Agent-comms offline tests green:

   ```bash
   export HVCG_REPO_ROOT="/Volumes/MacMiniPro2TB/HVCG Project Management System"
   ./scripts/agent-comms/run-tests.sh
   ```

4. Registry/heartbeat healthy; Master PM remains routing authority on `.agent-comms`.
5. No combined commit of `.agent-comms/**` + CRM `docs/crm/**` / `src/power-platform/solutions/**` / maker-oa reports.
6. CRM live Maker OA / smoke / auth **not interrupted** while parking CRM dirt.

---

## File ownership (merge surface)

### Exclusive / primary (comms packet)

- `.agent-comms/**` (bus state may be live — prefer infra+docs that belong on branch tip; avoid packaging ephemeral inbox noise if Master directs clean snapshot)
- `scripts/agent-comms/**`
- `docs/agents/*COMMS*`, `docs/agents/MESSAGE_PROTOCOL.md`, `docs/agents/FILE_LOCK_PROTOCOL.md`, `docs/agents/BOOTSTRAP_STATUS.md`, related bootstrap prompts when owned by this branch
- Root activate/bootstrap docs if intentionally part of tip: `AGENT_BOOTSTRAP_PROMPT.md`, `AGENT_COMMS_ACTIVATE.md`, `AGENT_COMMS_HANDOFF.md` (only if present on clean tip)

### Explicitly out of band (CRM contamination — exclude)

Do **not** include in this packet:

- `docs/crm/**` (except soft ownership note: Integration owns `PARALLEL_AGENT_MAP.md` on CRM integration branch — not part of comms merge)
- `deployment/reports/crm/**`, maker-oa acceptance JSON
- `src/power-platform/solutions/HVCGCommandCenterDev/**` env-var / Workflow churn from live Maker session
- Unrelated `PROJECT_STATUS.md` / `NEXT_SESSION.md` CRM smoke edits unless segregated into a CRM-only commit after park

### Locked shared indexes

`flows/_index.json`, `definitions/_index.json`, `lists/_index.json`, `command-center-views.json` remain **LOCKED**. Agent-comms does not own them.

---

## Test commands (offline)

```bash
export HVCG_REPO_ROOT="/Volumes/MacMiniPro2TB/HVCG Project Management System"
./scripts/agent-comms/run-tests.sh
# or:
python3 ./scripts/agent-comms/tests/test_comms.py -v
```

Optional smoke of CLI (non-destructive):

```bash
./scripts/agent-comms/list-agents.sh
./scripts/agent-comms/summary.sh
```

---

## Risks — CRM dirty MAIN contamination (critical)

| Risk | Severity | Detail |
|------|----------|--------|
| **CRM dirty MAIN contamination** | **CRITICAL** | Checkout `cursor/agent-communications` currently shares a working tree with ~60+ CRM/power-platform dirty paths and live `.agent-comms` inbox traffic. Merging “what’s dirty” would poison the comms narrative and risk broken CRM Maker session artifacts. |
| Combined commit risk | H | Master rule: do not create combined agent-comms + CRM commits. |
| Ephemeral bus messages in git | M | Inbox/outbox JSON churn may be intentional bus state; coordinate with Master before large bus snapshots in release PRs. |
| Dual use of MAIN for CRM smoke | H | Hold merge until CRM park/segregation inventory exists and smoke path is clear. |

**Mitigation:** Commit or stash **CRM-only** paths separately (CRM agent / owner); keep comms PR scoped to `.agent-comms` tooling + `scripts/agent-comms` + `docs/agents` protocol. Re-validate tests on a clean index. Only then request/execute D-003.

---

## Recommended order (relative)

1. **Segregate CRM dirty files** on MAIN (inventory + CRM-only park commit or stash) — **blocker for this packet**.
2. Confirm tip `2c064b3` (or later clean tip) + tests PASS with no CRM files staged.
3. Owner **D-003** for `MERGE-COMMS-001`.
4. Land Agent Comms (or confirm already on target integration line without dirt).
5. Then Executive packet `MERGE-EXEC-001` (append `SHARED_FILE_RECOMMENDATIONS.md` after exclusive merge).
6. Subsequent modules per Master Integration Plan.

---

## Integration stance

**HOLDING MERGES.** Offline draft only. Master READY queue received: executive + agent-comms READY, but **hold merges** until CRM park/segregation; **no D-003 requested yet**.

| Decision | Status |
|----------|--------|
| **D-003 Merge approval** | **Awaiting owner** — packet drafted; request deferred to Master PM |

# MASTER RISK REGISTER

**Owner:** Master PM  
**As of:** 2026-07-15 15:27 PT

| ID | Risk | Sev | Owner | Mitigation | Status |
|----|------|-----|-------|------------|--------|
| R-001 | CRM dirty tree mixed into `cursor/agent-communications` checkout (~68 files) | H | crm + agent-comms | Segregate commits; no combined release | Open |
| R-002 | Ops edited locked shared indexes | H | operations | Redesign: exclusive SoR; CONFLICT closed `0b544667`; parent replay later | Mitigated |
| R-003 | Zero module ACKs on bus despite unread queues | H | all modules | Paste `AGENT_BOOTSTRAP_PROMPT.md`; Master polls | Open |
| R-004 | Acceptance JSON vs PROJECT_STATUS mismatch (oauth/E2E) | M | crm | Reconcile evidence; no process interrupt | Open |
| R-005 | AI Governance 19 uncommitted list files | M | ai-governance | Commit on AI branch | Open |
| R-006 | Seeded heartbeats may overstate agent activity | M | master-pm | Require ACK + genuine HB before trust | Open |
| R-007 | Finance not started | L | finance | Start exclusive scaffold | Open |
| R-008 | Idle CRM worktrees may be restarted erroneously | M | master-pm | Keep VALIDATED/idle | Watch |
| R-009 | Activate prompt copies appearing in all worktrees | L | all | Do not commit unless intentional; prefer HVCG_REPO_ROOT | Watch |
| R-010 | Production touch | H | all | Hard forbid | Controlled |

## Uncommitted work log

| Location | Dirty count | Risk |
|----------|-------------|------|
| MAIN (`cursor/agent-communications`) | ~68 | H — CRM + prior WIP |
| `ai-governance-work-queues` | ~19–21 | M |
| `master-pm-orchestrator` | MASTER_* WIP (+ activate copies) | L — expected |
| executive / ops / portal / finance / integration | mostly activate copies (2) | L |

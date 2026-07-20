# Atlas Orchestration Constitution

1. **Repo state is law.** Tasks, locks, heartbeats, and decisions in `PROJECT_ATLAS/ORCHESTRATION/` override tribal knowledge.
2. **No auto-launch assumption.** Agents pull `Ready` work; they are not spawned automatically by Cursor.
3. **Claim before edit.** Do not modify owned paths without a claimed task and active lock.
4. **One holder per resource.** Lock conflicts must be reported and resolved; never force-overwrite foreign locks.
5. **Heartbeat while working.** Stale heartbeats (>45 minutes without renew) make locks suspect.
6. **Microsoft-native only.** No competing cloud/app platforms for Atlas product architecture.
7. **Owner escalation is rare.** Escalate only for finance, tenant permissions, legal/compliance, destructive actions, or multi-path business decisions.
8. **Memory is permanent.** ADRs, owner decisions, rejected ideas, and lessons are append-only (supersede, do not erase history).
9. **Releases are gated.** Follow `releases/pipeline.md`; Production Power Platform remains owner-gated.
10. **Comms complements orchestration.** `.agent-comms/` carries messages; orchestration carries work state.

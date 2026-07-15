# MERGE PACKET — Client Portal & Data Rooms (offline draft)

**Packet ID:** `MERGE-PORTAL-001`  
**Prepared by:** Integration (`integration`) on `agent/crm-integration`  
**As of:** 2026-07-15  
**Owner gate:** **Awaiting owner D-003** — **do not merge until issued**  
**Deploy policy:** NO merges, NO deploys, NO Production from this packet alone

---

## Candidate

| Field | Value |
|-------|--------|
| Branch | `cursor/client-portal-data-rooms` |
| Tip (READY) | `6998a7f` (docs READY); package tip noted `08bcfe8` |
| Worktree | `.worktrees/client-portal-data-rooms` |
| Agent status | **READY FOR INTEGRATION** (Master queue + portal HANDOFF on bus) |
| Shared appends | `docs/portal/SHARED_FILE_RECOMMENDATIONS.md` (parent-only) |

---

## Preconditions

1. Owner **D-003** for `MERGE-PORTAL-001` (not requested yet).
2. Prefer Agent Comms cleanliness + Executive exclusive merge sequencing per Master plan (portal after executive in safe order).
3. Offline PASS reconfirmed:

   ```bash
   cd .worktrees/client-portal-data-rooms
   python3 tests/unit/test_client_portal_data_rooms.py
   ```

4. Shared indexes remain LOCKED — parent applies recommendations only.
5. CRM Maker OA / smoke undisturbed.

---

## File ownership (merge surface)

### Exclusive

- `docs/portal/**`
- Portal flows / screens / lists / templates / sample-data under portal-exclusive paths (as on tip / HANDOFF)
- Portal migration pack if exclusive (e.g. `20260715_002` if present on tip)

### Parent-only

- Appends from `docs/portal/SHARED_FILE_RECOMMENDATIONS.md`
- Soft-conflict: `tests/Invoke-HVCGPreDeploymentTests.ps1` append-only portal check

### Do not include

- Locked shared indexes as exclusive edits
- CRM / Executive exclusive trees
- Production / external access enablement (owner-gated; defaults Disabled/false)

---

## Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| Soft-conflict on predeploy harness | M | Append-only |
| Premature merge before CRM park / D-003 | H | Hold merges |
| Schema apply before exclusive land | M | Owner-gated after merge |

---

## Recommended order

1. CRM park / Agent Comms clean packet  
2. Executive `MERGE-EXEC-001`  
3. **Client Portal `MERGE-PORTAL-001`**  
4. AI Governance → Ops replay → Finance  

---

## Stance

**HOLDING MERGES.** Offline draft only; Master queue noted READY; **awaiting owner D-003**.

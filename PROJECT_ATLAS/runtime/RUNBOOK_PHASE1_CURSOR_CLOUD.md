# Owner Runbook — Atlas Runtime Phase 1 (Cursor Cloud Dispatch)

**Task:** ATLAS-R-001  
**Owner:** Manuel Barela  
**Goal:** Programmatically launch one Cursor Cloud Agent, capture the result, close the validation task with evidence.

---

## 1. Capabilities confirmed (docs)

| Capability | Status | Notes |
|---|---|---|
| Cloud Agents API v1 | Available | `https://api.cursor.com/v1/agents` (public beta) |
| Auth | User/service API key | Basic (`-u KEY:`) or Bearer; Dashboard → Integrations / API Keys |
| Cloud Agent environments | Supported | `env.type=cloud` or default repo clone |
| Automations | Separate product surface | Not required for this PoC; API create+poll is sufficient |
| Webhooks | Coming soon on v1 | Legacy v0 has webhooks; PoC uses poll |
| SDK | `@cursor/sdk` / `cursor-sdk` | Atlas PoC uses REST adapter (stdlib) for zero-deps |

---

## 2. Owner actions (exact)

### A. Create API key (required once)

1. Open [Cursor Dashboard → Integrations](https://cursor.com/dashboard/integrations) (or API Keys).
2. Create a **user API key** (or team service-account key).
3. Confirm the GitHub repo `mblv89117/HVCG-05` is connected for Cloud Agents.
4. Store the key **outside git**:

```bash
# Preferred for PoC
security add-generic-password -U -a "$USER" -s "CURSOR_API_KEY" -w 'PASTE_KEY_HERE'

# Or env for one shell session
export CURSOR_API_KEY='PASTE_KEY_HERE'

# Or gitignored file
printf '%s\n' 'PASTE_KEY_HERE' > \
  "PROJECT_ATLAS/runtime/secrets/cursor_api_key"
chmod 600 "PROJECT_ATLAS/runtime/secrets/cursor_api_key"
```

### B. Ensure validation branch exists on origin

From the orchestration worktree (do **not** check out this branch into another worktree):

```bash
cd ".worktrees/sprint12-engineering-orchestration"
git fetch origin
git branch cursor/documentation-manager/runtime-validation-ATLAS-R-001 origin/main 2>/dev/null \
  || git branch cursor/documentation-manager/runtime-validation-ATLAS-R-001 HEAD
git push -u origin cursor/documentation-manager/runtime-validation-ATLAS-R-001
```

Record the pre-dispatch tip SHA for evidence:

```bash
git rev-parse origin/cursor/documentation-manager/runtime-validation-ATLAS-R-001
```

### C. Dispatch

```bash
cd ".worktrees/sprint12-engineering-orchestration"
python3 PROJECT_ATLAS/runtime/dispatch_cloud_agent.py \
  --task PROJECT_ATLAS/runtime/tasks/ATLAS-R-001.json
```

Expected exit codes:

| Code | Meaning |
|---|---|
| 0 | Cloud run `FINISHED` |
| 2 | Run error / cancelled / expired |
| 3 | Blocked (missing/invalid API key) |

### D. Verify evidence

1. `PROJECT_ATLAS/runtime/runs/ATLAS-R-001.json` — Atlas run record  
2. Remote file `PROJECT_ATLAS/ORCHESTRATION/runtime-validation.md` on the required branch  
3. Commit only that path; **do not merge to main**

### E. Close orchestration task

After PASS evidence exists, set `PROJECT_ATLAS/ORCHESTRATION/queue/tasks/ATLAS-R-001.json` status to `Closed` with commit hash + cloud run IDs.

---

## 3. Security

- Never commit `CURSOR_API_KEY`, `.env`, or `runtime/secrets/*` (except README / `.gitignore`).
- PoC: local env / Keychain / gitignored file.
- Phase 2: Azure Key Vault secret `cursor-api-key` via Managed Identity.
- Adapter never logs the API key.

---

## 4. Costs / plan limits

- Cloud Agents consume Cursor cloud agent usage (plan-dependent).
- API is public beta; rate limits apply (see API Overview).
- Webhooks not required for PoC; polling incurs wait time only.

---

## 5. Phase 2 design (preview)

Azure Durable Functions orchestration + Service Bus topics for parallel role dispatch; each message → Atlas dispatcher → Cloud Agents API; results written to orchestration state store; Key Vault for secrets. **Do not build until Phase 1 PASS.**

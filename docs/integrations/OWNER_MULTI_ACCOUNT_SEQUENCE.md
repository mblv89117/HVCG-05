# Owner Multi-Account Connection Sequence

**One consolidated, click-by-click approval path** for Manny (HVCG Owner). Complete steps in order. After each step, tell the Atlas agent **"done"** so discovery and validation can continue.

Multiple Microsoft connections are **allowed and expected** — adding a second account does **not** replace Manuel Barela's existing connection.

---

## CURRENT STEP (start here)

### **Add the next Microsoft mailbox/account that is NOT the one already connected (Manuel Barela)**

Manuel Barela / `highvaluecapitalgroup.com` is already connected. Your **immediate** task is to connect the **next** business mailbox — for example an HVS user account, a second HVCG user, or preparation for a shared mailbox.

---

## Prerequisites (one-time — likely already done)

| Item | Status |
|------|--------|
| Atlas Integration Hub (Dev) app registration in HVCG Entra | Registered |
| Hub redirect URI `http://localhost:8790/api/oauth/microsoft/callback` | Configured |
| Microsoft Graph delegated permissions + admin consent | Granted |
| Integration API running locally (`:8790`) | Dev agent starts this |
| Elite OS Connections Center (admin login) | Open as HVCG Owner |

---

## Step 1 — Add next Microsoft account (HVS or second HVCG user)

Use this when connecting **another user mailbox** in the same or a different Entra tenant.

1. Open **Atlas Elite OS** → sign in with your **HVCG Owner** account (Entra).
2. Navigate to **Connections Center** (admin-only).
3. Read the banner: *Multiple Microsoft connections are allowed — each account is stored separately.*
4. In **Business entity**, select:
   - **HVCG** — for another `@highvaluecapitalgroup.com` user, or
   - **HVS** — for High Value Solution LLC mailboxes, or
   - **legacy** / **unknown** if unsure (agent will refine later).
5. Click **Add Microsoft account** (not Disconnect on the existing Manuel Barela row).
6. Click **Begin authorization** in the wizard.
7. A new browser tab opens to **Microsoft sign-in**:
   - **Important:** In the account picker, choose the account you have **not** connected yet.
   - If you only see Manuel Barela, click **Use another account** and enter the other email (e.g. HVS primary mailbox).
   - If HVS uses a **different Entra tenant**, sign in with that tenant's credentials when prompted.
8. Review permissions (Read-Only Discovery — Mail, Calendar, Contacts, Files, Sites).
9. Click **Accept** / **Consent**.
10. Wait for the callback page (`Integration Hub` success JSON) — you may close that tab.
11. Return to Connections Center → click **Refresh**.
12. Confirm you now see **two** Microsoft rows (Manuel Barela + the new account). IDs must differ.
13. On the **new** row, click **Run discovery**.
14. Tell the agent **"done — added Microsoft account [email]"**.

**Do not** disconnect Manuel Barela unless explicitly instructed.

---

## Step 2 — Add Microsoft shared mailboxes

Shared mailboxes often require **Full Access** in Exchange Online and may need **`Directory.Read.All`** on the Hub app for enumeration.

1. **Exchange admin center** → **Recipients** → **Mailboxes** → select shared mailbox → **Mailbox delegation** → add your user with **Full Access** (if not already). Wait ~15 minutes for propagation.
2. (Optional, admin) **Entra admin center** → **App registrations** → **Atlas Integration Hub (Dev)** → **API permissions** → add delegated **`Directory.Read.All`** → **Grant admin consent**.
3. In Connections Center, set **Business entity** (HVCG or HVS).
4. Click **Add shared mailbox (Microsoft)**.
5. **Begin authorization** — sign in with a user who has Full Access to the shared mailbox (often your own admin account).
6. Complete consent → **Refresh** → confirm a new connection row with mailbox type **shared**.
7. Click **Run discovery** on that row.
8. Tell the agent **"done — shared mailbox [smtp address]"**.

Repeat for each shared mailbox (info@, ops@, etc.).

---

## Step 3 — Google accounts (one-by-one)

Complete [OWNER_APPROVAL_CHECKLIST.md](./OWNER_APPROVAL_CHECKLIST.md) section B first if Google OAuth is not configured.

1. Connections Center → **Business entity** → HVCG, HVS, or legacy.
2. Click **Add Google account**.
3. **Begin authorization** → Google account picker → choose **one** account.
4. Accept read-only scopes (Gmail, Drive, Calendar, Contacts).
5. **Refresh** → verify new Google row (does not replace Microsoft rows).
6. **Run discovery** on that row.
7. Repeat steps 1–6 for each additional Gmail / Workspace user.
8. Tell the agent **"done — Google [email]"** after each account.

---

## Step 4 — GitHub App + organizations

Complete [OWNER_APPROVAL_CHECKLIST.md](./OWNER_APPROVAL_CHECKLIST.md) section C first.

1. Connections Center → **Business entity** → HVCG or HVS as appropriate.
2. Click **Add GitHub organization**.
3. **Begin authorization** / install flow → select **GitHub App** installation target.
4. Choose organization(s) and **repository access** (start with Atlas-related repos; expand later).
5. **Refresh** → confirm GitHub connection row(s).
6. **Run discovery** → verify repos listed.
7. Tell the agent **"done — GitHub org [slug]"**.

---

## Step 5 — Accounting, payments, storage (later)

These connectors are **scaffold-only** in Connections Center until Phase 5.

| System | Action |
|--------|--------|
| QuickBooks / Xero | Defer — agent will schedule when mail + Drive stable |
| Mercury / Square / Cash App | Defer — confirm which entity owns each account |
| Dropbox / Box | Use disabled **Add storage / accounting** button as placeholder; agent enables when ready |
| DocuSign | Defer — legal retention review first |

No owner action required until the agent requests Phase 5.

---

## After all active steps — validation checklist

- [ ] Connections Center **Inventory** tab shows all connections with entity + mailbox type
- [ ] Each Microsoft account has independent row and **Run discovery** completed
- [ ] Manuel Barela connection still **Connected** (not replaced)
- [ ] [HVS_ACCOUNT_CONNECTION_INVENTORY.md](./HVS_ACCOUNT_CONNECTION_INVENTORY.md) updated with domains Manny listed
- [ ] Agent ran **Sync all** and **Rebuild Client 360** (admin buttons) when prompted

---

## Troubleshooting (quick)

| Symptom | Fix |
|---------|-----|
| New Microsoft login replaces feeling of "same" connection | Check **two rows** in table — each has unique ID; disconnect only the wrong row |
| Shared mailbox empty after discovery | Confirm Full Access + wait 15 min; retry discovery |
| Google "redirect_uri_mismatch" | Match redirect URI in Google Cloud to `http://127.0.0.1:8790/api/oauth/google/callback` |
| Hub offline | Ask agent to start `atlas-integration-api` on port 8790 |

Full detail: [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)

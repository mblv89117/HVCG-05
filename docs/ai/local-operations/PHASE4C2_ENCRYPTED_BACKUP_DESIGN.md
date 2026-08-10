# Phase 4C-2 Encrypted Backup Design

**Library/method:** Node.js built-in `node:crypto` (OpenSSL) — AES-256-GCM authenticated encryption; scrypt KDF (N=16384,r=8,p=1).

No custom cipher. Passphrase via `LOCAL_AI_BACKUP_PASSPHRASE` or request body — never logged, never stored in DB, never committed.

Format: `atlas-local-ai-backup-v1` with `.sqlite.enc` + `.manifest.json` (salt/iv/authTag metadata only).

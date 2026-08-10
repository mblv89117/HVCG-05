# Backup Key Management

1. Set `LOCAL_AI_BACKUP_PASSPHRASE` in local private env (not git).
2. Rotate: create new encrypted backup with new passphrase; retain old passphrase until old backups retired.
3. Remove: unset env var; unencrypted backups still work.
4. Never paste passphrase into tickets/logs/commits.

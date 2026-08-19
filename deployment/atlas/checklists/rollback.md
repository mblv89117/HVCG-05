# Checklist — Rollback

- [ ] Failure captured in deployment log
- [ ] Contain: disable offending flows / flags
- [ ] Run `Rollback-HVCGOS.ps1 -Environment development` (when approved)
- [ ] Re-run health + smoke
- [ ] Document root cause in release notes addendum
- [ ] If Prod incident: stop — use Track-1 rollback guides (outside Atlas execution)

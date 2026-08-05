# Phase 4B-2 ClamAV Installation and Configuration Guide

**Host:** local Mac mini (worktree hardening only)  
**Date:** 2026-08-05  
**Authorized command:** `brew install clamav` only

## Versions

| Component | Value |
| --- | --- |
| ClamAV / clamscan | **1.5.3** |
| freshclam | **1.5.3** (same package) |
| Binary | `/opt/homebrew/bin/clamscan` |
| freshclam | `/opt/homebrew/bin/freshclam` |
| Config dir | `/opt/homebrew/etc/clamav/` |
| Database dir | `/opt/homebrew/var/lib/clamav/` |
| Update log | `/opt/homebrew/var/log/freshclam.log` |

## Minimal freshclam.conf (local machine only — not committed)

Path: `/opt/homebrew/etc/clamav/freshclam.conf`

```
DatabaseDirectory /opt/homebrew/var/lib/clamav
DatabaseOwner macminipro
UpdateLogFile /opt/homebrew/var/log/freshclam.log
LogTime yes
Checks 1
DatabaseMirror database.clamav.net
```

Notes:

- `Example` line removed (required for freshclam to run)
- No `SubmitDetectionStats` / sample submission enabled
- No public `clamd` network listener started for this phase (CLI `clamscan` only)
- No automatic file deletion; quarantine is Hub staging `quarantine/` only

## Update command

```bash
freshclam
```

## Definition status (after update)

| Database | Version | Signatures (approx) | Build / note |
| --- | --- | --- | --- |
| daily.cvd | **28083** | 355579 | 05 Aug 2026 06:24 UTC |
| main.cvd | **63** | 3287027 | 16 Dec 2025 |
| bytecode.cvd | **339** | 80 | 11 Sep 2025 |

`clamscan --version` reports: `ClamAV 1.5.3/28083/Tue Aug  4 23:24:50 2026`

## Do not commit

- `/opt/homebrew/var/lib/clamav/*.cvd`
- `/opt/homebrew/etc/clamav/freshclam.conf`
- EICAR samples (generated only at test runtime)

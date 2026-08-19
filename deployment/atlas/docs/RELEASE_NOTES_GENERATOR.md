# Release Notes Generator — Project Atlas

## Purpose

Produce consistent release notes from a stamp + checklist of changes.

## Command

```powershell
pwsh -File ./deployment/atlas/scripts/New-AtlasReleaseNotes.ps1 `
  -Environment development `
  -Version "0.1.0-dev" `
  -Summary "Atlas framework scaffolding"
```

## Output

`deployment/atlas/reports/release-notes-<stamp>.md` from `templates/release-notes.md`.

## Sections

- Summary  
- Environment  
- Changes  
- Validation results  
- Feature flags  
- Rollback pointer  
- Known issues  

# Checklist — Pre-flight

- [ ] Branch/worktree identified
- [ ] `Test-AtlasEnvironmentGuard.ps1 -Environment development` PASS
- [ ] `config/environments/development.json` present (from example; not committed)
- [ ] PAC profile points at **Development** (if using PAC) — never Production
- [ ] Solution package path known
- [ ] Feature flags file reviewed (`flags/feature-flags.development.json`)
- [ ] Teams notify = false
- [ ] Client emails = false
- [ ] No pending Prod freeze edits under `releases/Track-1-Live-Internal/`
- [ ] Pre-deployment tests planned (`tests/Invoke-HVCGPreDeploymentTests.ps1`)

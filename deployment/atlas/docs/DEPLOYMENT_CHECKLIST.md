# Deployment Checklist — Project Atlas

Master checklist spanning Atlas environments. Use the focused files under `checklists/`.

## Order of operations (Development)

1. [ ] Environment guard (`development`)  
2. [ ] Pre-flight validation  
3. [ ] Feature flags reviewed (Teams/email remain Off)  
4. [ ] Deploy Dev package (owner/QA approved run — **not this delivery**)  
5. [ ] Health checks  
6. [ ] Smoke tests  
7. [ ] Post-deployment validation  
8. [ ] Release notes generated  
9. [ ] Deployment log written  
10. [ ] Dashboard metrics updated  

## Never on Atlas 0.1.0-dev

- [ ] ~~Connect to Production~~  
- [ ] ~~Deploy to Production~~  
- [ ] ~~Enable Teams notify~~  
- [ ] ~~Enable client emails~~  
- [ ] ~~Publish canvas~~  
- [ ] ~~Import client data~~  
- [ ] ~~Change DNS~~  

## Checklists

| File | Use |
|------|-----|
| `checklists/preflight.md` | Before any deploy wrapper |
| `checklists/deploy-dev.md` | Development deploy |
| `checklists/post-deploy.md` | After Dev apply |
| `checklists/rollback.md` | Failure path |

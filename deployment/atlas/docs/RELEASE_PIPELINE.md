# Release Pipeline — Project Atlas

## Stages

```text
Validate → Development → Testing → Staging → Production(BLOCKED)
```

| Stage | Atlas | Notes |
|-------|-------|-------|
| Validate | Online unit/schema | Reuses `tests/validate_predeployment.py` pattern |
| Development | Allowed | Primary |
| Testing | Scaffold | Manual gate |
| Staging | Scaffold | Blue/Green rehearsal |
| Production | **Blocked** | Requires future framework revision + owner approval |

## Pipeline file

`pipeline/atlas-release-pipeline.yml` — Azure DevOps–style definition.  
Prod stage is present as documentation and fails closed.

## Existing mirrors

- `deployment/pipelines/azure-pipelines.yml`
- `.github/workflows/hvcg-os-release.yml`

Atlas pipeline is the **framework orchestration view**; it does not replace those files.

## Gate policy

Every promotion requires:

1. Environment guard PASS  
2. Pre-flight PASS  
3. Deploy (or package apply) — **not executed in this delivery**  
4. Health PASS  
5. Smoke PASS  
6. Post-deploy validation PASS  
7. Release notes generated  
8. Deployment log written  

## This delivery

Pipeline YAML is authored for QA review. **Do not run** against any live environment until QA signs off.

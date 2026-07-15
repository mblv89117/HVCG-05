# Next Session

**Generated:** 2026-07-15 (~11:05 PT)  
**Mode:** Dev Maker OA **PARTIAL** — offline PASS; live import **BLOCKED on pac device-code auth**

## Current project status

- **Product:** HVCG OS **v1.1.0**
- **Branch:** `cursor/v1.1.0-intelligence-ai-ops`
- **Schema:** Still clean from repair (`schema-validation-20260715-103353.json`, hasDrift=false / 1170)
- **Tooling:** `pac` 2.9.3 + .NET 10 installed on this Mac (`~/.dotnet/tools`)
- **Acceptance:** `docs/crm/ACCEPTANCE_REPORT.md` (PARTIAL); evidence `deployment/reports/crm/maker-oa-acceptance-latest.json`

## Do next (resume after auth)

1. Complete or refresh: `export PATH="$HOME/.dotnet:$HOME/.dotnet/tools:$PATH"` then  
   `pac auth create --deviceCode --name HVCG-Dev-Maker`  
   Open `https://login.microsoft.com/device`, enter code, finish MFA as Global/Maker admin.
2. `pac org list` → select **HVCG Development** only (never Prod).
3. Import/rebuild 4 CRM flows Off; bind SharePoint Dev; keep `hvcg_CrmEnableTeamsNotify=false`.
4. Build/publish canvas screens per `docs/crm/POWER_APPS_BUILD_GUIDE.md`.
5. Live smoke + fill acceptance → commit.

## Do not

- Production / OA-CRM-11 without separate approval
- Enable Teams notify or company channels
- Modify frozen SharePoint deployment engines
- Commit `.worktrees/` or secrets

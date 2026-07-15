# scrHomeExec — exclusive build sheet overlay

**Canonical shared stub:** `src/power-apps/screens/scrHomeExec.md` (do not edit on this branch — see recommendations)  
**This file:** Maker implementation detail for Executive Command Center module.

## OnVisible

```
If(!nfExecIsOwner && !nfExecIsFinanceViewer, Navigate(scrHomeOps, ScreenTransition.None));
UpdateContext({ varCashPeriod: "MTD" });
```

## Controls (minimum)

1. `hdrExec` — label “Executive Command Center”
2. `conKpiStrip` — horizontal container of 8 × `cmpExecKpiTile`
3. `conPulse` — health strip + capacity pulse
4. `conMyWork` — 2×2 or tabbed galleries (Decisions, Approvals, Risks, Meetings)
5. `conCapital` — capital status + proposals gallery
6. `btnRefresh` — `Refresh` critical lists
7. `lblLastRefreshed` — `Text(Now(), "yyyy-mm-dd hh:mm")`

## Navigation map

| From | To |
|------|----|
| Pipeline tile | scrCRM (if published) |
| Capital tile | scrCapital |
| Decision item | scrRegisters or decision form (detail) |
| Client attention | scrClientDetail with varSelectedClient |

## Desktop layout reference

See `layout-desktop.md`.

## Phone layout reference

See `layout-phone.md`.

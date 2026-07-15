# Component — cmpExecKpiTile

**Type:** Canvas component (input properties)  
**Used on:** scrHomeExec Row A & phone KPI scroll

## Inputs

| Property | Type | Description |
|----------|------|-------------|
| `Label` | Text | Tile title (e.g. Pipeline $) |
| `ValueText` | Text | Pre-formatted currency or count |
| `SubLabel` | Text | Optional (e.g. MTD) |
| `Tone` | Text | `Neutral` \| `Good` \| `Warn` \| `Bad` |
| `OnSelect` | Behavior | Navigate / set filter |

## Visual

- Large value, small label above  
- Left tone bar for Warn/Bad only  
- No decorative icons  

## Accessibility

- `AccessibleLabel` = Label & ": " & ValueText  
- Minimum tap target 44pt on phone

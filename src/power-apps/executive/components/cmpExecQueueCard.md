# Component — cmpExecQueueCard

**Type:** Canvas component for decision / risk / approval / meeting rows

## Inputs

| Property | Type | Description |
|----------|------|-------------|
| `ClientCode` | Text | Business key |
| `Title` | Text | Row title |
| `Meta` | Text | Deadline, amount, or stage |
| `Severity` | Text | Critical \| High \| Medium \| Low \| Info |
| `OnSelect` | Behavior | Deep link |

## Behavior

- Entire row tappable  
- Severity chip color via `Switch(Severity, ...)`  
- Truncate Title at 2 lines

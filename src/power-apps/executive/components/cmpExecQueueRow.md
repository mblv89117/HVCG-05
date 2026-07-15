# Component: cmpExecQueueRow

Row template for executive attention galleries.

## Properties

| Prop | Type |
|------|------|
| SourceList | Text |
| ItemTitle | Text |
| ClientCode | Text |
| Reason | Text (`EscalationReason` or health/risk text) |
| OwnerEmail | Text |
| DueLabel | Text |
| OnOpen | Behavior |

## Layout

```
[ClientCode]  ItemTitle
Reason · Owner · Due
[Open →]
```

## Rules

- Color not sole signal: show "Red" / "High" text beside icon.  
- Blank ClientCode → show "Firm-wide".

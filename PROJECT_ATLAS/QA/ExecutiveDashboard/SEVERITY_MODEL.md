# Severity model — Executive Dashboard / Elite OS

| Severity | Definition | Release impact |
|----------|------------|----------------|
| **S0 Critical** | Data loss, security breach, secrets exposure, fabricated finance presented as real, auth bypass | **Block all promotion** |
| **S1 High** | Primary workflow broken, placeholders presented as product, RBAC not enforced for client/docs, deploy unreachable | **Block Prod / Owner demo as complete** |
| **S2 Medium** | Secondary workflow degraded, incomplete role matrix, missing refresh indicators, a11y gaps | Conditional Dev UAT only with documented limits |
| **S3 Low** | Cosmetic, copy, non-blocking UX | Fix in next sprint |
| **S4 Info** | Observations, tech debt (bundle size), env hygiene | Track only |

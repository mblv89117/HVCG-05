# 05 — Tenant Isolation

## Isolation hierarchy

```
TenantId (Entra tenant GUID)
  └── OrganizationCode
        └── WorkspaceCode
              └── ClientCode (when applicable)
```

Every platform row that is not a pure tenant catalog entry carries `TenantId`.  
Dev/UAT/Prod use **different sites/environments**; never mix tenants in one list without `TenantId` filter.

## Row-level rules

| WorkspaceType | Visibility |
|---------------|------------|
| Internal | Organization staff; not client guests |
| Client | Single DefaultClientCode (+ assigned staff) |
| Executive | Cross-client Metrics/Clients **only** if Permission allows |

## Permission model (canonical)

`Permission` rows define:

- `RoleCode`
- `ResourceType` (Entity logical name or `*` )
- `Action` (`Read`, `Write`, `Approve`, `Admin`, `Export`)
- `Scope` (`Tenant`, `Organization`, `Workspace`, `Client`)

Entra security groups remain the **enforcement** plane for SharePoint ACLs; Permission catalog is the **Atlas app** authorization map (Power Apps / Elite OS). Security partner owns ACL binding.

## Anti-patterns

- Separate list schemas per client tenant  
- Hard-coded ClientCode filters only in UI with no Workspace key  
- Cross-client Relationship edges without Security approval (`IsCrossClient`)

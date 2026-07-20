# Client Portal V1 — Mock Interface Specifications

**Rule:** UI only. Every external dependency is mocked; no credentials or live connections.

## Dependency contracts

| Interface | V1 mock behavior | Future owner |
|-----------|------------------|--------------|
| Identity | Static `PortalUser` and assigned `clientIds` | Microsoft Entra ID / Track 4 auth |
| Documents | In-memory request rows and mock upload URI | SharePoint / OneDrive |
| Messaging | Local React state with mock history | Secure messaging service / Power Automate |
| Meetings | Mock slots and non-navigating Teams URLs | Outlook / Teams / Bookings |
| Invoices | Read-only mock invoice rows and disabled PDFs | Finance / accounting interface |
| Funding | Client-safe mock `FundingRequest` stage | CRM/Capital interface |
| Notifications | In-memory read/unread state | Notification orchestration |
| E-signature | Mock draft envelope identifier | Selected e-sign provider |

## Interface boundary rules

1. UI imports only mock adapters from `src/integrations/mockIntegrations.ts`.
2. Every domain row includes `clientId` for workspace isolation.
3. No component imports SharePoint, Microsoft Graph, Dataverse, CRM, or accounting SDKs.
4. No API keys, tenant IDs, production URLs, email, or SMS actions.
5. Cross-track implementation requires a separately approved adapter; V1 defines contracts only.

## Suggested future ports

```ts
interface DocumentPort {
  listRequests(clientId: string): Promise<DocumentRequest[]>
  upload(clientId: string, requestId: string, file: File): Promise<SecureFile>
}

interface BillingPort {
  listInvoices(clientId: string): Promise<Invoice[]>
}

interface NotificationPort {
  list(clientId: string): Promise<NotificationItem[]>
  markRead(clientId: string, notificationId: string): Promise<void>
}
```

These are specifications, not implemented production integrations.

/** Mock integrations — configuration-driven stubs only. No live credentials. */

export type IntegrationStatus = 'Mocked' | 'ConfigOnly' | 'Disabled'

export interface MockIntegration {
  id: string
  name: string
  purpose: string
  status: IntegrationStatus
  lastSyncMock: string
  notes: string
}

export const mockIntegrations: MockIntegration[] = [
  {
    id: 'stripe',
    name: 'Stripe',
    purpose: 'Card / ACH payment status (mock receipts)',
    status: 'Mocked',
    lastSyncMock: '2026-07-16T08:00:00Z',
    notes: 'No API keys. Receipt IDs are synthetic.',
  },
  {
    id: 'quickbooks',
    name: 'QuickBooks',
    purpose: 'External accounting id mirror (not GL)',
    status: 'ConfigOnly',
    lastSyncMock: 'never',
    notes: 'ExternalAccountingId fields only; no QBO writes.',
  },
  {
    id: 'mercury',
    name: 'Mercury',
    purpose: 'Cash position snapshot',
    status: 'Mocked',
    lastSyncMock: '2026-07-15T18:00:00Z',
    notes: 'Demo cash balance only. No live bank connection.',
  },
  {
    id: 'square',
    name: 'Square',
    purpose: 'Alternate payment rails',
    status: 'Disabled',
    lastSyncMock: 'never',
    notes: 'Reserved. Not used in Sprint 1.',
  },
  {
    id: 'powerbi',
    name: 'Power BI',
    purpose: 'CEO / Finance semantic model export',
    status: 'ConfigOnly',
    lastSyncMock: 'never',
    notes: 'Measures documented; no workspace publish from this sprint.',
  },
  {
    id: 'lists',
    name: 'Microsoft Lists',
    purpose: 'Operational SoR mirror (Invoices, Milestones)',
    status: 'Mocked',
    lastSyncMock: '2026-07-16T06:00:00Z',
    notes: 'UI reads local mockStore shaped like HVCG_* lists.',
  },
]

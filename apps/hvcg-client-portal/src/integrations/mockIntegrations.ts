/**
 * Mock integration adapters — no production credentials.
 * Each method returns a deterministic stub suitable for Dev/MVP demos.
 */

export type IntegrationName =
  | 'entraId'
  | 'sharePoint'
  | 'oneDrive'
  | 'teams'
  | 'outlook'
  | 'powerAutomate'
  | 'bookMeeting'
  | 'documentRequests'
  | 'eSignature'

export interface IntegrationStatus {
  name: IntegrationName
  label: string
  mode: 'mocked' | 'disabled'
  ready: boolean
  notes: string
}

const catalog: IntegrationStatus[] = [
  {
    name: 'entraId',
    label: 'Microsoft Entra ID',
    mode: 'mocked',
    ready: true,
    notes: 'Mock session only. BL-C1 gates live guest invites.',
  },
  {
    name: 'sharePoint',
    label: 'SharePoint',
    mode: 'mocked',
    ready: true,
    notes: 'Maps to HVCG client libraries / data rooms when wired.',
  },
  {
    name: 'oneDrive',
    label: 'OneDrive',
    mode: 'mocked',
    ready: true,
    notes: 'Upload staging path mocked locally.',
  },
  {
    name: 'teams',
    label: 'Microsoft Teams',
    mode: 'mocked',
    ready: true,
    notes: 'Meeting join URLs are stubs; notify flag stays Off.',
  },
  {
    name: 'outlook',
    label: 'Outlook',
    mode: 'disabled',
    ready: false,
    notes: 'Client email outbound disabled by default.',
  },
  {
    name: 'powerAutomate',
    label: 'Power Automate',
    mode: 'mocked',
    ready: true,
    notes: 'Portal flows remain Off until owner activation.',
  },
  {
    name: 'bookMeeting',
    label: 'Book a Meeting',
    mode: 'mocked',
    ready: true,
    notes: 'Returns mock scheduling slots.',
  },
  {
    name: 'documentRequests',
    label: 'Document Requests',
    mode: 'mocked',
    ready: true,
    notes: 'Reusable checklist engine backed by mock store.',
  },
  {
    name: 'eSignature',
    label: 'E-signature',
    mode: 'mocked',
    ready: true,
    notes: 'Stub envelope create/status — no live provider.',
  },
]

export const integrations = {
  list(): IntegrationStatus[] {
    return catalog
  },
  get(name: IntegrationName): IntegrationStatus {
    const found = catalog.find((c) => c.name === name)
    if (!found) throw new Error(`Unknown integration: ${name}`)
    return found
  },
  async mockUpload(fileName: string): Promise<{ ok: true; path: string }> {
    await delay(120)
    return { ok: true, path: `mock://onedrive/uploads/${encodeURIComponent(fileName)}` }
  },
  async mockBookMeeting(isoDate: string): Promise<{ ok: true; slot: string }> {
    await delay(80)
    return { ok: true, slot: isoDate }
  },
  async mockESign(documentName: string): Promise<{ ok: true; envelopeId: string; status: 'Draft' }> {
    await delay(100)
    return { ok: true, envelopeId: `env-mock-${documentName.length}`, status: 'Draft' }
  },
}

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

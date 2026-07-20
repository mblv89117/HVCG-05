import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { PortalProvider } from '../state/PortalContext'
import { AppShell } from '../layout/AppShell'
import { HomePage } from '../pages/HomePage'
import { ExecutiveSummaryPage } from '../pages/ExecutiveSummaryPage'
import { DataRoomPage } from '../pages/DataRoomPage'
import { DocumentsPage } from '../pages/DocumentsPage'
import { NotesPage } from '../pages/NotesPage'
import { FundingPage } from '../pages/FundingPage'
import { DATA_ROOM_CATEGORIES, FUNDING_STAGES } from '../types'
import { integrations } from '../integrations/mockIntegrations'
import {
  activityEvents,
  clients,
  dataRoomDocuments,
  documentRequests,
  kpis,
  notifications,
} from '../data/mockStore'
import { CCB_CLIENT_ID, ccbClient } from '../data/coloradoCraftBeef'
import { canContribute, canViewVisibility } from '../data/access'

function renderPortal(initial = '/') {
  return render(
    <PortalProvider>
      <MemoryRouter initialEntries={[initial]}>
        <Routes>
          <Route element={<AppShell />}>
            <Route index element={<HomePage />} />
            <Route path="summary" element={<ExecutiveSummaryPage />} />
            <Route path="data-room" element={<DataRoomPage />} />
            <Route path="documents" element={<DocumentsPage />} />
            <Route path="notes" element={<NotesPage />} />
            <Route path="funding" element={<FundingPage />} />
          </Route>
        </Routes>
      </MemoryRouter>
    </PortalProvider>,
  )
}

describe('HVCG Client Portal — CCB workspace', () => {
  it('renders branding and CCB home', () => {
    renderPortal('/')
    expect(screen.getByText('High Value Capital Group')).toBeInTheDocument()
    expect(screen.getByText('Client Portal')).toBeInTheDocument()
    expect(screen.getByText('Colorado Craft Beef')).toBeInTheDocument()
    expect(screen.getByText(/Randy Kamin/i)).toBeInTheDocument()
  })

  it('shows verified CCB relationship on executive summary', () => {
    renderPortal('/summary')
    expect(screen.getByRole('heading', { name: 'Executive Summary' })).toBeInTheDocument()
    expect(screen.getByText(/Generational Group/i)).toBeInTheDocument()
    expect(screen.getAllByText(/HVS referral/i).length).toBeGreaterThan(0)
    expect(screen.getByText(/Non-dilutive financing/i)).toBeInTheDocument()
    expect(screen.getAllByText(/Blueprint/i).length).toBeGreaterThan(0)
  })

  it('seeds verified CCB client facts without invented financial amounts', () => {
    expect(ccbClient.referralSource).toContain('Randy Kamin')
    expect(ccbClient.originalRelationship).toBe('HVS referral')
    expect(ccbClient.currentRelationship).toBe('HVCG')
    expect(ccbClient.originalObjectives).toEqual(['Growth capital', 'Additional real estate'])
    expect(ccbClient.financingThemes).toEqual(['Non-dilutive financing', 'Agricultural financing'])
    expect(kpis.filter((k) => k.clientId === CCB_CLIENT_ID).every((k) => !/\$\d/.test(k.value))).toBe(true)
  })

  it('provides all required data-room categories', () => {
    expect(DATA_ROOM_CATEGORIES).toEqual([
      'Corporate',
      'Financial',
      'Tax',
      'Legal',
      'Insurance',
      'Ownership',
      'Debt',
      'Real Estate',
      'Operations',
      'Capital',
      'Compliance',
      'Engagement',
      'Deliverables',
    ])
    renderPortal('/documents')
    expect(screen.getAllByText('Corporate').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Deliverables').length).toBeGreaterThan(0)
  })

  it('renders funding stages without inventing CCB dollar targets', () => {
    renderPortal('/funding')
    for (const stage of FUNDING_STAGES) {
      expect(screen.getByText(stage)).toBeInTheDocument()
    }
    expect(screen.getAllByText('Awaiting verified data').length).toBeGreaterThan(0)
  })

  it('hides internal notes from Client Contributor role', () => {
    renderPortal('/notes')
    expect(screen.getByText(/Verified relationship summary/i)).toBeInTheDocument()
    expect(screen.queryByText(/INTERNAL — fee discussion/i)).not.toBeInTheDocument()
  })

  it('reveals internal notes for HVCG Owner role', async () => {
    const user = userEvent.setup()
    renderPortal('/notes')
    await user.selectOptions(screen.getByLabelText(/Select portal role/i), 'HVCG Owner')
    expect(screen.getByText(/INTERNAL — fee discussion/i)).toBeInTheDocument()
  })

  it('isolates client data rooms by clientId', () => {
    const ccbDocs = dataRoomDocuments.filter((d) => d.clientId === CCB_CLIENT_ID)
    const accgOnly = dataRoomDocuments.filter((d) => d.clientId === 'cli-accg')
    expect(ccbDocs.every((d) => d.clientId === CCB_CLIENT_ID)).toBe(true)
    expect(accgOnly.some((d) => d.name.includes('ACCG_ONLY'))).toBe(true)
    expect(ccbDocs.some((d) => d.name.includes('ACCG_ONLY'))).toBe(false)
  })

  it('enforces Executive Dashboard release role matrix', () => {
    expect(canContribute('Read-Only Advisor')).toBe(false)
    expect(canContribute('Client Contributor')).toBe(true)
    expect(canContribute('Client Executive')).toBe(true)
    expect(canViewVisibility('Client Executive', 'Internal')).toBe(false)
    expect(canViewVisibility('Client Contributor', 'Internal')).toBe(false)
    expect(canViewVisibility('Read-Only Advisor', 'Internal')).toBe(false)
    expect(canViewVisibility('HVCG Owner', 'Internal')).toBe(true)
    expect(canViewVisibility('HVCG Team Member', 'Internal')).toBe(true)
    expect(canViewVisibility('Administrator', 'Internal')).toBe(true)
  })

  it('keeps notifications client-scoped and in-app gated', () => {
    expect(notifications.every((n) => n.clientId)).toBe(true)
    expect(notifications.some((n) => n.channel === 'EmailDisabled')).toBe(true)
    expect(activityEvents.every((a) => a.clientId)).toBe(true)
    expect(documentRequests.every((d) => d.clientId)).toBe(true)
  })

  it('supports multi-client catalog with unique codes', () => {
    expect(clients.some((c) => c.code === 'CCB')).toBe(true)
    expect(new Set(clients.map((c) => c.code)).size).toBe(clients.length)
  })

  it('keeps integrations mocked without live outbound', () => {
    const list = integrations.list()
    expect(list.every((i) => i.mode === 'mocked' || i.mode === 'disabled')).toBe(true)
    expect(list.find((i) => i.name === 'outlook')?.ready).toBe(false)
  })
})

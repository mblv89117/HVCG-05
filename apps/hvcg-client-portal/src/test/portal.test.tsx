import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { PortalProvider } from '../state/PortalContext'
import { AppShell } from '../layout/AppShell'
import { HomePage } from '../pages/HomePage'
import { FundingPage } from '../pages/FundingPage'
import { DocumentsPage } from '../pages/DocumentsPage'
import { FUNDING_STAGES, DOCUMENT_FOLDERS } from '../types'
import { integrations } from '../integrations/mockIntegrations'
import { clients } from '../data/mockStore'

function renderPortal(initial = '/') {
  return render(
    <PortalProvider>
      <MemoryRouter initialEntries={[initial]}>
        <Routes>
          <Route element={<AppShell />}>
            <Route index element={<HomePage />} />
            <Route path="funding" element={<FundingPage />} />
            <Route path="documents" element={<DocumentsPage />} />
          </Route>
        </Routes>
      </MemoryRouter>
    </PortalProvider>,
  )
}

describe('HVCG Client Portal MVP', () => {
  it('renders navigation and branding', () => {
    renderPortal('/')
    expect(screen.getByText('High Value Capital Group')).toBeInTheDocument()
    expect(screen.getByText('Client Portal')).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: /Portal sections/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/Select client workspace/i)).toBeInTheDocument()
  })

  it('shows client home metrics', () => {
    renderPortal('/')
    expect(screen.getByText(/Welcome,/i)).toBeInTheDocument()
    expect(screen.getByText(/Funding stage/i)).toBeInTheDocument()
  })

  it('renders all funding stages', () => {
    renderPortal('/funding')
    for (const stage of FUNDING_STAGES) {
      expect(screen.getByText(stage)).toBeInTheDocument()
    }
  })

  it('renders document checklist folders', () => {
    renderPortal('/documents')
    expect(screen.getAllByText('Financial Statements').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Pitch Deck').length).toBeGreaterThan(0)
  })

  it('supports multi-client mock catalog', () => {
    expect(clients.length).toBeGreaterThanOrEqual(3)
    expect(new Set(clients.map((c) => c.code)).size).toBe(clients.length)
  })

  it('document folder catalog is complete', () => {
    expect(DOCUMENT_FOLDERS.length).toBe(15)
  })

  it('integrations are mocked without credentials', () => {
    const list = integrations.list()
    expect(list.every((i) => i.mode === 'mocked' || i.mode === 'disabled')).toBe(true)
    expect(list.find((i) => i.name === 'outlook')?.ready).toBe(false)
  })
})

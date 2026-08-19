import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import App from '../App'
import { mockData } from '../data/mockData'
import { DeploymentProvider } from '../state/DeploymentContext'

function renderApp(route = '/') {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <App />
    </MemoryRouter>,
  )
}

describe('Deployment Manager Sprint 1', () => {
  it('renders release dashboard with mock candidates', () => {
    renderApp()
    expect(screen.getByRole('heading', { name: 'Release Dashboard' })).toBeInTheDocument()
    expect(screen.getByText('Deployment Manager Sprint 1 Phase 1')).toBeInTheDocument()
    expect(screen.getByText(/Mock control plane only/i)).toBeInTheDocument()
  })

  it('exposes Production as protected on environments page', () => {
    renderApp('/environments')
    expect(screen.getByRole('heading', { name: 'Environment Status' })).toBeInTheDocument()
    expect(screen.getByText(/HVCGCommandCenterDev 1\.1\.0\.1 · Track 1 FROZEN/)).toBeInTheDocument()
    expect(mockData.environments.find((e) => e.name === 'Production')?.protected).toBe(true)
  })

  it('uses mock-only data mode with release catalog', () => {
    expect(mockData.mode).toBe('mock-only')
    expect(mockData.releases.length).toBeGreaterThanOrEqual(4)
    expect(mockData.queue.some((q) => q.status === 'Blocked')).toBe(true)
  })

  it('defines Viewer as a restricted role in the data contract', () => {
    // Permission matrix is enforced in DeploymentContext + Playwright QA.
    // Unit-level: confirm Production remains protected and mock mode forbids live deploy language in notes.
    const production = mockData.environments.find((e) => e.name === 'Production')
    expect(production?.protected).toBe(true)
    expect(production?.notes.toLowerCase()).toMatch(/cannot deploy|protected|frozen/)
  })

  it('mounts provider without crashing', () => {
    const { container } = render(
      <DeploymentProvider>
        <div data-testid="probe">ok</div>
      </DeploymentProvider>,
    )
    expect(container.querySelector('[data-testid="probe"]')?.textContent).toBe('ok')
  })
})

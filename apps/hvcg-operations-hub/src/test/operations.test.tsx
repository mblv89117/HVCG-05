import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import App from '../App'
import { roleModuleAccess } from '../data/mockData'

afterEach(() => {
  cleanup()
  window.history.pushState({}, '', '/')
})

describe('Operations Hub Sprint 1', () => {
  it('renders operations pulse with required Phase 1 KPIs', () => {
    render(<App />)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/operations pulse/i)
    for (const label of ['Tasks due today', 'Waiting on input', 'Active blockers', 'Meetings today', 'Pending approvals', 'Release windows', 'Team capacity', 'Doc health']) {
      expect(screen.getByText(label)).toBeInTheDocument()
    }
    expect(screen.getByTestId('ops-due-list')).toBeInTheDocument()
  })

  it('navigates to every owner module', async () => {
    const user = userEvent.setup()
    render(<App />)
    const routes = [
      ['team', /team capacity/i],
      ['projects', /active project board/i],
      ['sop', /standard operating procedures/i],
      ['ai', /agent fleet status/i],
      ['human', /people capacity board/i],
      ['notifications', /ops signal feed/i],
    ] as const
    for (const [id, heading] of routes) {
      await user.click(screen.getByTestId(`nav-${id}`))
      expect(await screen.findByRole('heading', { name: heading })).toBeInTheDocument()
    }
  })

  it('filters SOP library by search', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByTestId('nav-sop'))
    await user.type(screen.getByTestId('sop-search'), 'Release Gate')
    const list = screen.getByTestId('sop-list')
    expect(within(list).getByText(/Release Gate Checklist/i)).toBeInTheDocument()
    expect(within(list).queryByText(/Capacity Planning Cadence/i)).not.toBeInTheDocument()
  })

  it('applies Assistant permissions and protects AI route', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.selectOptions(screen.getByRole('combobox', { name: 'Dashboard role' }), 'Assistant')
    expect(screen.queryByTestId('nav-ai')).not.toBeInTheDocument()
    expect(screen.queryByTestId('nav-human')).not.toBeInTheDocument()
    expect(screen.queryByTestId('nav-projects')).not.toBeInTheDocument()
    expect(screen.getByTestId('nav-operations')).toBeInTheDocument()
    expect(screen.getByTestId('nav-team')).toBeInTheDocument()
    expect(roleModuleAccess.Assistant).toEqual(['operations', 'team', 'sop', 'notifications'])
    window.history.pushState({}, '', '/ai')
    window.dispatchEvent(new PopStateEvent('popstate'))
    await waitFor(() => expect(window.location.pathname).toBe('/'))
  })

  it('marks visible notifications read', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByTestId('nav-notifications'))
    expect(screen.getByText(/Ops Hub Sprint 1 Phase 1 approved/i)).toBeInTheDocument()
    await user.click(screen.getByTestId('mark-all-read'))
    expect(screen.getByTestId('mark-all-read')).toHaveTextContent(/Mark all read \(0\)/)
  })

  it('renders AI workforce table with eight agents', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByTestId('nav-ai'))
    const table = screen.getByTestId('ai-agents')
    expect(within(table).getByText('Master PM')).toBeInTheDocument()
    expect(within(table).getByText('Documentation')).toBeInTheDocument()
    expect(within(table).getAllByRole('row')).toHaveLength(9)
  })
})

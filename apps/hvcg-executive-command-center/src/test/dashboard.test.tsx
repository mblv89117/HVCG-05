import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import App from '../App'

afterEach(() => {
  cleanup()
  window.history.pushState({}, '', '/')
})

describe('Executive Command Center', () => {
  it('renders the owner overview with required Phase 1 KPIs', () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: /leadership/i })).toBeInTheDocument()
    for (const label of ['Revenue pipeline', 'Qualified prospects', 'Active clients', 'Funding pipeline', 'Cash collected', 'Tasks due today', 'Meetings today']) {
      expect(screen.getByText(label)).toBeInTheDocument()
    }
    expect(screen.getByText('AI daily brief')).toBeInTheDocument()
  })

  it('navigates to every owner dashboard', async () => {
    const user = userEvent.setup()
    render(<App />)
    const routes = [
      ['revenue', 'Revenue performance'],
      ['clients', 'Client portfolio'],
      ['operations', 'Operating control plane'],
      ['financial', 'Financial performance'],
      ['ai', 'Executive intelligence'],
      ['notifications', 'Notifications'],
    ]
    for (const [id, heading] of routes) {
      await user.click(screen.getByTestId(`nav-${id}`))
      expect(await screen.findByRole('heading', { name: heading })).toBeInTheDocument()
    }
  })

  it('applies Assistant permissions and protects the Financial route', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.selectOptions(screen.getByRole('combobox', { name: 'Dashboard role' }), 'Assistant')
    expect(screen.queryByTestId('nav-financial')).not.toBeInTheDocument()
    expect(screen.queryByTestId('nav-revenue')).not.toBeInTheDocument()
    expect(screen.getByTestId('nav-operations')).toBeInTheDocument()
    window.history.pushState({}, '', '/financial')
    window.dispatchEvent(new PopStateEvent('popstate'))
    await waitFor(() => expect(window.location.pathname).toBe('/'))
  })

  it('marks visible notifications read without exposing restricted notifications', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.selectOptions(screen.getByRole('combobox', { name: 'Dashboard role' }), 'Assistant')
    await user.click(screen.getByTestId('nav-notifications'))
    expect(screen.queryByText('Pricing exception requires owner approval')).not.toBeInTheDocument()
    expect(screen.getByText('Sprint QA completed')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Mark all read' }))
    expect(screen.getByTestId('notification-unread-count')).toHaveTextContent('0')
  })
})

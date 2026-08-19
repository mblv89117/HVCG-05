import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import App from '../App'
import { MetricCard, SourceBadge } from '../components/Dashboard'

afterEach(() => {
  cleanup()
  window.history.pushState({}, '', '/')
})

describe('Atlas CEO Command Center', () => {
  it('renders the executive home with seven source-labelled health domains', () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: /good morning, manny/i })).toBeInTheDocument()
    for (const label of ['Overall Company Health', 'Revenue Health', 'Operations Health', 'Client Delivery Health', 'Engineering Health', 'Production Status', 'Cash and Revenue Indicators']) {
      const card = screen.getByText(label).closest('article')
      expect(card).not.toBeNull()
      expect(within(card as HTMLElement).getByText(/Repository-derived|Unavailable/)).toBeInTheDocument()
    }
  })

  it('navigates to every required module', async () => {
    const user = userEvent.setup()
    render(<App />)
    const routes = [
      ['approvals', 'Decisions waiting for Manny'],
      ['agents', 'Agent assignments and gates'],
      ['portfolio', 'Every operating-system track'],
      ['revenue', 'Revenue visibility without invented numbers'],
      ['engineering', 'Track 9 EOS at a glance'],
      ['brief', 'What Manny needs to know'],
    ]
    for (const [id, heading] of routes) {
      await user.click(screen.getByTestId(`nav-${id}`))
      expect(await screen.findByRole('heading', { name: heading })).toBeInTheDocument()
    }
  })

  it('keeps approval actions local and visibly non-live', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByTestId('nav-approvals'))
    await user.click(screen.getAllByRole('button', { name: 'Approve placeholder' })[0])
    expect(screen.getByRole('status')).toHaveTextContent('No live action executed')
    expect(screen.getByText('Approved locally')).toBeInTheDocument()
  })

  it('shows all nine Atlas tracks and the Track 1 freeze', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByTestId('nav-portfolio'))
    expect(screen.getAllByTestId('track-card')).toHaveLength(9)
    expect(screen.getByText('FROZEN — LIVE—INTERNAL')).toBeInTheDocument()
  })

  it('labels every revenue KPI unavailable instead of inventing a value', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByTestId('nav-revenue'))
    expect(screen.getAllByText('Unavailable').length).toBeGreaterThanOrEqual(10)
    expect(screen.getByText('Fictional Client Alpha')).toBeInTheDocument()
    expect(screen.getAllByText('Development sample').length).toBeGreaterThanOrEqual(2)
  })

  it('shows EOS compatibility and Production protection', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByTestId('nav-engineering'))
    expect(screen.getByText('0 open EOS items')).toBeInTheDocument()
    expect(screen.getByText('ENFORCED')).toBeInTheDocument()
    expect(screen.getByText(/No merge, deployment, Track 1 change/)).toBeInTheDocument()
  })

  it('states missing data and release prohibition in the morning brief', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByTestId('nav-brief'))
    expect(screen.getByText(/Current opportunity values are unavailable/)).toBeInTheDocument()
    expect(screen.getByText(/Nothing is ready for release/)).toBeInTheDocument()
  })

  it('renders malicious dynamic strings as text without creating HTML elements', () => {
    render(<MetricCard metric={{ id: 'xss', label: '<img src=x onerror=alert(1)>', value: '<script>alert(1)</script>', detail: 'safe', source: { kind: 'Development sample', label: 'test' } }} />)
    expect(screen.getByText('<img src=x onerror=alert(1)>')).toBeInTheDocument()
    expect(screen.getByText('<script>alert(1)</script>')).toBeInTheDocument()
    expect(document.querySelector('img')).toBeNull()
    expect(document.querySelector('script')).toBeNull()
  })

  it('makes stale and unavailable source states explicit', () => {
    render(<SourceBadge source={{ kind: 'Repository-derived', label: 'test', stale: true }} />)
    expect(screen.getByText('Repository-derived · STALE')).toBeInTheDocument()
  })
})

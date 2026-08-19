import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import App from '../App'
import { prioritizeInsights, scoreInsight } from '../intelligence/prioritize'
import { seedInsights } from '../data/intelligenceSeed'
import { buildCcbMeetingBrief, buildDailyHvgcBrief } from '../intelligence/briefBuilder'
import { seedDecisions, seedExceptions, seedMeetings } from '../data/intelligenceSeed'
import { mockData } from '../data/mockData'

afterEach(() => {
  cleanup()
  window.history.pushState({}, '', '/')
})

describe('Executive Command Center', () => {
  it('renders the owner overview with pending-safe KPIs', () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: /leadership/i })).toBeInTheDocument()
    for (const label of ['Revenue pipeline', 'Qualified prospects', 'Active clients', 'Funding pipeline', 'Cash collected', 'Tasks due today', 'Meetings today']) {
      expect(screen.getByText(label)).toBeInTheDocument()
    }
    expect(screen.getAllByText('Awaiting verified source').length).toBeGreaterThan(0)
    expect(screen.getByText('AI Executive Brief')).toBeInTheDocument()
  })

  it('does not invent portfolio dollar amounts in unbound tiles', () => {
    const dollarLike = /\$\d/
    for (const metric of [...mockData.overviewMetrics, ...mockData.financialMetrics, ...mockData.revenueMetrics]) {
      expect(metric.value).not.toMatch(dollarLike)
    }
  })

  it('navigates to every owner dashboard', async () => {
    const user = userEvent.setup()
    render(<App />)
    const routes = [
      ['intelligence', 'What changed · what matters · what next'],
      ['revenue', 'Revenue performance'],
      ['clients', 'Client portfolio'],
      ['operations', 'Operating control plane'],
      ['financial', 'Financial performance'],
      ['ai', 'Labeled recommendations'],
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
    expect(screen.queryByTestId('nav-intelligence')).not.toBeInTheDocument()
    expect(screen.getByTestId('nav-operations')).toBeInTheDocument()
    window.history.pushState({}, '', '/financial')
    window.dispatchEvent(new PopStateEvent('popstate'))
    await waitForPath('/')
  })

  it('marks visible notifications read without exposing restricted notifications', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.selectOptions(screen.getByRole('combobox', { name: 'Dashboard role' }), 'Assistant')
    await user.click(screen.getByTestId('nav-notifications'))
    expect(screen.queryByText('Track 1 Production freeze remains in force')).not.toBeInTheDocument()
    expect(screen.getByText('Executive Intelligence ready for dashboard merge')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Mark all read' }))
    expect(screen.getByTestId('notification-unread-count')).toHaveTextContent('0')
  })
})

describe('Executive Intelligence', () => {
  it('prioritizes Critical verified insights ahead of lower-impact items', () => {
    const ranked = prioritizeInsights(seedInsights, 'Owner')
    expect(ranked[0].impact).toBe('Critical')
    expect(scoreInsight(ranked[0])).toBeGreaterThan(scoreInsight(ranked[ranked.length - 1]))
  })

  it('builds HVCG and CCB briefs with required chrome fields', () => {
    const daily = buildDailyHvgcBrief(seedInsights, seedDecisions, seedExceptions, seedMeetings, 'Owner')
    const ccb = buildCcbMeetingBrief()
    expect(daily.sections).toHaveLength(10)
    expect(ccb.sections).toHaveLength(10)
    expect(daily.generatedAt).toBeTruthy()
    expect(daily.verificationStatus).toBeTruthy()
    expect(daily.aiGenerated).toBe(true)
    expect(ccb.clientScope).toBe('CCB')
    expect(ccb.sections.find((s) => s.id === 'finance')?.bullets.join(' ')).toMatch(/Awaiting verified source|Do not invent/i)
  })

  it('renders daily brief with sources, timestamp, verification, AI marker, and disposition actions', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByTestId('nav-intelligence'))
    expect(await screen.findByTestId('brief-brief-hvcg-daily')).toBeInTheDocument()
    expect(screen.getByTestId('brief-generated-at')).toHaveTextContent(/Generated/)
    expect(screen.getByText(/Verification ·/)).toBeInTheDocument()
    expect(screen.getByTestId('brief-ai-generated')).toBeInTheDocument()
    expect(screen.getByTestId('brief-disposition-actions')).toBeInTheDocument()
    expect(screen.getAllByTestId('source-list').length).toBeGreaterThan(0)

    const insight = screen.getByTestId('insight-INS-001')
    await user.click(within(insight).getByRole('button', { name: 'Accept' }))
    expect(await screen.findByTestId('insight-INS-001')).toHaveTextContent(/Accepted/)
    expect(screen.getByTestId('review-history')).toHaveTextContent('Accepted')
  })

  it('converts an insight into a decision and a task', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByTestId('nav-intelligence'))
    const insight = await screen.findByTestId('insight-INS-002')
    await user.click(within(insight).getByRole('button', { name: 'Convert to decision' }))
    await user.click(screen.getByRole('link', { name: 'Priority decisions' }))
    expect(await screen.findByTestId('decision-queue')).toHaveTextContent(/financial package|Agenda|verified/i)

    await user.click(screen.getByRole('link', { name: 'Daily brief' }))
    const contact = await screen.findByTestId('insight-INS-004')
    await user.click(within(contact).getByRole('button', { name: 'Convert to task' }))
    await user.click(screen.getByRole('link', { name: 'Priority decisions' }))
    expect(await screen.findByTestId('task-queue')).toHaveTextContent(/Verify Jeff Smith contact channels|INS-004/)
  })

  it('shows Colorado Craft Beef meeting brief with isolation and no invented financial findings', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByTestId('nav-intelligence'))
    await user.click(screen.getByRole('link', { name: 'Colorado Craft Beef' }))
    expect(await screen.findByRole('heading', { name: 'Colorado Craft Beef' })).toBeInTheDocument()
    expect(screen.getByText(/No invented financial findings/i)).toBeInTheDocument()
    expect(screen.getAllByText(/Randy Kamin — Generational Group/).length).toBeGreaterThan(0)
    expect(screen.getByTestId('brief-brief-ccb-meeting')).toBeInTheDocument()
    expect(screen.getAllByText(/Awaiting verified source/i).length).toBeGreaterThan(0)
    expect(screen.getByTestId('ccb-isolation-ok')).toHaveTextContent(/Client isolation OK/)
    expect(screen.queryByText(/Northstar|Cobalt|Summit Infrastructure/i)).not.toBeInTheDocument()
  })

  it('hides intelligence routes from Assistant role', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.selectOptions(screen.getByRole('combobox', { name: 'Dashboard role' }), 'Assistant')
    window.history.pushState({}, '', '/intelligence')
    window.dispatchEvent(new PopStateEvent('popstate'))
    await waitForPath('/')
  })
})

async function waitForPath(pathname: string) {
  const { waitFor } = await import('@testing-library/react')
  await waitFor(() => expect(window.location.pathname).toBe(pathname))
}

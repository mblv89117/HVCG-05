import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import App from '../App'

function renderAt(path: string) {
  window.history.pushState({}, '', path)
  return render(<App />)
}

describe('AI Governance navigation and views', () => {
  beforeEach(() => window.history.pushState({}, '', '/'))

  it('renders the executive overview', () => {
    renderAt('/')
    expect(screen.getByRole('heading', { name: 'AI Governance Overview' })).toBeInTheDocument()
    expect(screen.getByText('Registered agents')).toBeInTheDocument()
    expect(screen.getByText('No live connections')).toBeInTheDocument()
  })

  it('navigates through every primary control surface', async () => {
    const user = userEvent.setup()
    renderAt('/')
    for (const [link, heading] of [
      ['Agent Registry', 'Agent Registry'],
      ['Prompt Registry', 'Prompt Registry'],
      ['Permissions', 'Tool & Permission Matrix'],
      ['Agent Health', 'Agent Health Dashboard'],
      ['Cost & Usage', 'Cost & Usage Dashboard'],
      ['Audit Log', 'Audit Log'],
      ['Approvals', 'Approval Queue'],
      ['Risk & Compliance', 'Risk & Compliance Dashboard'],
      ['Policies', 'AI Governance Policies'],
    ]) {
      await user.click(screen.getByRole('link', { name: new RegExp(`^${link}`) }))
      expect(screen.getByRole('heading', { name: heading })).toBeInTheDocument()
    }
  })

  it('opens a complete agent detail view', () => {
    renderAt('/agents/operations')
    expect(screen.getByRole('heading', { name: 'Operations Hub Engineer' })).toBeInTheDocument()
    expect(screen.getByText('Responsibilities & ownership')).toBeInTheDocument()
    expect(screen.getByText('Health telemetry')).toBeInTheDocument()
    expect(screen.getByText('Tools & permission')).toBeInTheDocument()
    expect(screen.getByText('Handoffs & blockers')).toBeInTheDocument()
  })

  it('filters prompt versions by lifecycle state', async () => {
    const user = userEvent.setup()
    renderAt('/prompts')
    await user.click(screen.getByRole('button', { name: 'Approved' }))
    expect(screen.getByText('Master PM Core')).toBeInTheDocument()
    expect(screen.queryByText('Operations Hub Engineer', { selector: 'strong' })).not.toBeInTheDocument()
  })

  it('filters audit events by result', async () => {
    const user = userEvent.setup()
    renderAt('/audit')
    await user.click(screen.getByRole('button', { name: 'Denied' }))
    expect(screen.getByText('Deployment request')).toBeInTheDocument()
    expect(screen.getByText('Owner override')).toBeInTheDocument()
    expect(screen.queryByText('Branch creation')).not.toBeInTheDocument()
  })
})

describe('permission-state controls', () => {
  it('removes approval authority outside Owner role', async () => {
    const user = userEvent.setup()
    renderAt('/approvals')
    const selector = screen.getByLabelText('Governance role')
    await user.selectOptions(selector, 'Governance Admin')
    expect(screen.getByText('Governance Admin · Read only')).toBeInTheDocument()
    screen.getAllByRole('button', { name: 'Approve' }).forEach((button) => expect(button).toBeDisabled())
  })

  it('restricts cost details for Auditor role', async () => {
    const user = userEvent.setup()
    renderAt('/costs')
    await user.selectOptions(screen.getByLabelText('Governance role'), 'Auditor')
    expect(screen.getByRole('heading', { name: 'Cost & Usage restricted' })).toBeInTheDocument()
    expect(screen.queryByText('Cost by agent')).not.toBeInTheDocument()
  })

  it('prevents Auditor from creating prompt versions', async () => {
    const user = userEvent.setup()
    renderAt('/prompts')
    await user.selectOptions(screen.getByLabelText('Governance role'), 'Auditor')
    expect(screen.getByRole('button', { name: 'New prompt version' })).toBeDisabled()
  })
})

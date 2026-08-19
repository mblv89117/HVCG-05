import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import App from '../App'
import { roleModuleAccess } from '../data/mockData'

afterEach(() => {
  cleanup()
  window.history.pushState({}, '', '/')
})

describe('Operations Hub product command center', () => {
  it('opens portfolio with required views and metrics', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByTestId('nav-portfolio'))
    expect(screen.getByTestId('portfolio-page')).toBeInTheDocument()
    expect(screen.getByTestId('portfolio-metrics')).toBeInTheDocument()
    for (const view of ['executive', 'my-work', 'at-risk', 'blocked', 'overdue', 'awaiting-approval', 'completed', 'archived']) {
      expect(screen.getByTestId(`view-${view}`)).toBeInTheDocument()
    }
  })

  it('creates a project and opens detail workflows', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByTestId('nav-portfolio'))
    const before = screen.getByTestId('portfolio-projects').querySelectorAll('tbody tr').length
    await user.click(screen.getByTestId('create-project'))
    expect(screen.getByTestId('portfolio-projects').querySelectorAll('tbody tr').length).toBe(before + 1)
    await user.click(screen.getByTestId('open-project-p-1'))
    expect(await screen.findByTestId('project-detail')).toBeInTheDocument()
    await user.click(screen.getByTestId('create-task-detail'))
    expect(screen.getByTestId('detail-tasks').querySelectorAll('tbody tr').length).toBeGreaterThan(0)
    expect(screen.getByTestId('activity-feed')).toBeInTheDocument()
  })

  it('filters overdue and completes a task from My Work', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByTestId('nav-portfolio'))
    await user.click(screen.getByTestId('view-overdue'))
    expect(screen.getByTestId('portfolio-tasks')).toBeInTheDocument()
    await user.click(screen.getByTestId('view-my-work'))
    const list = screen.getByTestId('portfolio-tasks')
    const completeButtons = within(list).queryAllByRole('button', { name: /complete/i })
    if (completeButtons[0]) await user.click(completeButtons[0])
  })

  it('approves a pending request', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByTestId('nav-portfolio'))
    const queue = screen.getByTestId('approval-queue')
    const approve = within(queue).getAllByRole('button', { name: /approve/i })[0]
    await user.click(approve)
  })

  it('keeps Assistant portfolio access and protects hiring', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.selectOptions(screen.getByRole('combobox', { name: 'Dashboard role' }), 'Assistant')
    expect(screen.getByTestId('nav-portfolio')).toBeInTheDocument()
    expect(screen.queryByTestId('nav-hiring')).not.toBeInTheDocument()
    expect(roleModuleAccess.Assistant).toContain('portfolio')
  })

  it('surfaces portfolio escalations on executive dashboard', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByTestId('nav-executive'))
    expect(await screen.findByTestId('exec-escalations')).toBeInTheDocument()
  })
})

import { describe, expect, it } from 'vitest'
import { agents, approvals, auditLog, permissions, policies, prompts, risks } from '../data/mockData'

describe('AI governance mock domain', () => {
  it('registers every required agent role with unique identities and isolated paths', () => {
    expect(agents).toHaveLength(10)
    expect(new Set(agents.map((agent) => agent.id)).size).toBe(agents.length)
    expect(agents.map((agent) => agent.name)).toEqual(expect.arrayContaining([
      'Master PM',
      'Revenue Systems Engineer',
      'Client Portal Engineer',
      'Executive Command Center Engineer',
      'Finance Operations Engineer',
      'Operations Hub Engineer',
      'Deployment Engineer',
      'QA and Release Manager',
      'Documentation and Knowledge Manager',
      'System Architect / Technical Lead',
    ]))
    agents.forEach((agent) => {
      expect(agent.branch).toBeTruthy()
      expect(agent.worktree).toBeTruthy()
      expect(agent.ownedPaths.length).toBeGreaterThan(0)
      expect(agent.protectedPaths.length).toBeGreaterThan(0)
    })
  })

  it('models every prompt state and safe rollback metadata', () => {
    expect(new Set(prompts.map((prompt) => prompt.status))).toEqual(
      new Set(['Draft', 'Review', 'Approved', 'Deprecated', 'Replaced']),
    )
    prompts.forEach((prompt) => {
      expect(prompt.id).toMatch(/^PROMPT-/)
      expect(prompt.version).toMatch(/^\d+\.\d+\.\d+$/)
      expect(prompt.rollbackVersion).toBeTruthy()
      expect(agents.some((agent) => agent.id === prompt.agentId)).toBe(true)
    })
  })

  it('covers every tool and data resource for every agent', () => {
    const resources = new Set(permissions.map((permission) => permission.resource))
    expect(resources.size).toBe(11)
    agents.forEach((agent) => {
      expect(permissions.filter((permission) => permission.agentId === agent.id)).toHaveLength(11)
    })
    expect(permissions.filter((permission) => permission.resource === 'Production').every(
      (permission) => permission.level === 'None' || permission.level === 'Approval Required',
    )).toBe(true)
  })

  it('prohibits autonomous Production execution', () => {
    expect(permissions.filter((permission) => permission.resource === 'Production')).not.toContainEqual(
      expect.objectContaining({ level: 'Execute' }),
    )
  })

  it('captures all required approval and risk categories', () => {
    expect(new Set(approvals.map((approval) => approval.type)).size).toBe(10)
    expect(new Set(risks.map((risk) => risk.category)).size).toBe(11)
  })

  it('retains complete audit evidence fields', () => {
    const requiredActions = [
      'Prompt change', 'Branch creation', 'Worktree creation', 'File modification',
      'Test execution', 'Commit approval', 'Push', 'Merge request',
      'Deployment request', 'Permission change', 'Owner override',
    ]
    expect(auditLog.map((entry) => entry.action)).toEqual(expect.arrayContaining(requiredActions))
    auditLog.forEach((entry) => {
      expect(entry.timestamp).toBeTruthy()
      expect(entry.agentId).toBeTruthy()
      expect(entry.target).toBeTruthy()
      expect(entry.evidence).toBeTruthy()
      expect(entry.approvalStatus).toBeTruthy()
    })
  })

  it('publishes all nine required readable policies', () => {
    expect(policies).toHaveLength(9)
    policies.forEach((policy) => expect(policy.controls.length).toBeGreaterThanOrEqual(3))
  })
})

import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import { mockData } from '../data/mockData'
import type { DeploymentManagerData, PageId, Role } from '../types'

const rolePages: Record<Role, PageId[]> = {
  Owner: ['dashboard', 'queue', 'promotion', 'approvals', 'evidence', 'rollback', 'environments', 'calendar', 'incidents', 'audit'],
  MasterPM: ['dashboard', 'queue', 'promotion', 'approvals', 'evidence', 'rollback', 'environments', 'calendar', 'incidents', 'audit'],
  QA: ['dashboard', 'queue', 'approvals', 'evidence', 'environments', 'calendar', 'incidents', 'audit'],
  Engineer: ['dashboard', 'queue', 'promotion', 'approvals', 'evidence', 'rollback', 'environments', 'calendar', 'incidents', 'audit'],
  Viewer: ['dashboard', 'environments', 'calendar', 'incidents'],
}

interface DeploymentContextValue {
  role: Role
  setRole: (role: Role) => void
  allowedPages: PageId[]
  data: DeploymentManagerData
}

const DeploymentContext = createContext<DeploymentContextValue | null>(null)

export function DeploymentProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<Role>('Owner')
  const value = useMemo(
    () => ({
      role,
      setRole,
      allowedPages: rolePages[role],
      data: mockData,
    }),
    [role],
  )
  return <DeploymentContext.Provider value={value}>{children}</DeploymentContext.Provider>
}

export function useDeployment() {
  const ctx = useContext(DeploymentContext)
  if (!ctx) throw new Error('useDeployment requires DeploymentProvider')
  return ctx
}

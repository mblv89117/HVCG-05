import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'

export type GovernanceRole = 'Owner' | 'Governance Admin' | 'Auditor'

interface GovernanceContextValue {
  role: GovernanceRole
  setRole: (role: GovernanceRole) => void
  canApprove: boolean
  canViewCosts: boolean
  canEditPrompts: boolean
}

const GovernanceContext = createContext<GovernanceContextValue | null>(null)

export function GovernanceProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<GovernanceRole>('Owner')
  const value = useMemo(
    () => ({
      role,
      setRole,
      canApprove: role === 'Owner',
      canViewCosts: role !== 'Auditor',
      canEditPrompts: role === 'Owner' || role === 'Governance Admin',
    }),
    [role],
  )
  return <GovernanceContext.Provider value={value}>{children}</GovernanceContext.Provider>
}

export function useGovernance() {
  const context = useContext(GovernanceContext)
  if (!context) throw new Error('useGovernance must be used within GovernanceProvider')
  return context
}

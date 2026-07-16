import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import mockStore from '../data/mockStore'
import type { FinanceRole, FinanceStore } from '../types'
import { roleAccess } from '../types'

interface FinanceContextValue {
  store: FinanceStore
  role: FinanceRole
  setRole: (role: FinanceRole) => void
  canAccess: (routeKey: string) => boolean
}

const FinanceContext = createContext<FinanceContextValue | null>(null)

export function FinanceProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<FinanceRole>('Owner')
  const value = useMemo(
    () => ({
      store: mockStore,
      role,
      setRole,
      canAccess: (routeKey: string) => roleAccess[role].includes(routeKey),
    }),
    [role],
  )
  return <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>
}

export function useFinance() {
  const ctx = useContext(FinanceContext)
  if (!ctx) throw new Error('useFinance must be used within FinanceProvider')
  return ctx
}

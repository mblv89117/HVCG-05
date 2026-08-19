import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import { commandCenterData } from '../data/commandCenterData'
import type { ApprovalItem, ApprovalState, CommandCenterData } from '../types'

interface DashboardContextValue {
  data: CommandCenterData
  approvals: ApprovalItem[]
  updateApproval: (id: string, state: ApprovalState) => void
  actionNotice: string
}

const DashboardContext = createContext<DashboardContextValue | null>(null)

export function DashboardProvider({ children }: { children: ReactNode }) {
  const [states, setStates] = useState<Record<string, ApprovalState>>({})
  const [actionNotice, setActionNotice] = useState('')
  const approvals = useMemo(
    () => commandCenterData.approvals.map((item) => ({ ...item, state: states[item.id] ?? item.state })),
    [states],
  )

  const value = useMemo<DashboardContextValue>(
    () => ({
      data: commandCenterData,
      approvals,
      actionNotice,
      updateApproval: (id, state) => {
        setStates((current) => ({ ...current, [id]: state }))
        setActionNotice(`Development placeholder only: ${id} marked "${state}". No live action executed.`)
      },
    }),
    [approvals, actionNotice],
  )

  return <DashboardContext.Provider value={value}>{children}</DashboardContext.Provider>
}

export function useDashboard() {
  const value = useContext(DashboardContext)
  if (!value) throw new Error('useDashboard must be used inside DashboardProvider')
  return value
}

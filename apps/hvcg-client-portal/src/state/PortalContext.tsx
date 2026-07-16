import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import {
  advisors,
  clients,
  currentUser,
  documentRequests,
  engagements,
  fundingRequests,
  meetings,
  messages,
  notifications,
  secureFiles,
  tasks,
  threads,
} from '../data/mockStore'
import type { Client } from '../types'

interface PortalContextValue {
  user: typeof currentUser
  clients: Client[]
  activeClientId: string
  setActiveClientId: (id: string) => void
  activeClient: Client
  advisor: (typeof advisors)[number]
  engagement: (typeof engagements)[number] | undefined
  funding: (typeof fundingRequests)[number] | undefined
  docs: typeof documentRequests
  threads: typeof threads
  messages: typeof messages
  tasks: typeof tasks
  meetings: typeof meetings
  notifications: typeof notifications
  files: typeof secureFiles
}

const PortalContext = createContext<PortalContextValue | null>(null)

export function PortalProvider({ children }: { children: ReactNode }) {
  const [activeClientId, setActiveClientId] = useState(clients[0].id)

  const value = useMemo(() => {
    const activeClient = clients.find((c) => c.id === activeClientId) ?? clients[0]
    const advisor = advisors.find((a) => a.id === activeClient.advisorId) ?? advisors[0]
    return {
      user: currentUser,
      clients,
      activeClientId: activeClient.id,
      setActiveClientId,
      activeClient,
      advisor,
      engagement: engagements.find((e) => e.clientId === activeClient.id),
      funding: fundingRequests.find((f) => f.clientId === activeClient.id),
      docs: documentRequests.filter((d) => d.clientId === activeClient.id),
      threads: threads.filter((t) => t.clientId === activeClient.id),
      messages,
      tasks: tasks.filter((t) => t.clientId === activeClient.id),
      meetings: meetings.filter((m) => m.clientId === activeClient.id),
      notifications: notifications.filter((n) => n.clientId === activeClient.id),
      files: secureFiles.filter((f) => f.clientId === activeClient.id),
    }
  }, [activeClientId])

  return <PortalContext.Provider value={value}>{children}</PortalContext.Provider>
}

export function usePortal() {
  const ctx = useContext(PortalContext)
  if (!ctx) throw new Error('usePortal must be used within PortalProvider')
  return ctx
}

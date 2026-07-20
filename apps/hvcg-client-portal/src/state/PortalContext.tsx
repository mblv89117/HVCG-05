import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import {
  activityEvents,
  aiInsights,
  approvals,
  advisors,
  capitalRoadmap,
  clients,
  contacts,
  currentUser,
  dataRoomDocuments,
  decisions,
  deliverables,
  documentRequests,
  engagements,
  fundingRequests,
  invoices,
  kpis,
  meetings,
  messages,
  milestones,
  notes,
  notifications,
  pipelineParties,
  projects,
  secureFiles,
  tasks,
  timelineEvents,
  threads,
} from '../data/mockStore'
import { canContribute, canViewVisibility } from '../data/access'
import type { Client, PortalRole, PortalUser } from '../types'

interface PortalContextValue {
  user: PortalUser
  setUserRole: (role: PortalRole) => void
  clients: Client[]
  activeClientId: string
  setActiveClientId: (id: string) => void
  activeClient: Client
  advisor: (typeof advisors)[number]
  engagement: (typeof engagements)[number] | undefined
  funding: (typeof fundingRequests)[number] | undefined
  projects: typeof projects
  contacts: typeof contacts
  docs: typeof documentRequests
  dataRoom: typeof dataRoomDocuments
  threads: typeof threads
  messages: typeof messages
  tasks: typeof tasks
  approvals: typeof approvals
  meetings: typeof meetings
  notifications: typeof notifications
  files: typeof secureFiles
  timeline: typeof timelineEvents
  milestones: typeof milestones
  invoices: typeof invoices
  kpis: typeof kpis
  roadmap: typeof capitalRoadmap
  pipeline: typeof pipelineParties
  notes: typeof notes
  decisions: typeof decisions
  deliverables: typeof deliverables
  insights: typeof aiInsights
  activity: typeof activityEvents
  canContribute: boolean
  canViewInternal: boolean
}

const PortalContext = createContext<PortalContextValue | null>(null)

export function PortalProvider({ children }: { children: ReactNode }) {
  const [activeClientId, setActiveClientId] = useState(clients[0].id)
  const [role, setUserRole] = useState<PortalRole>(currentUser.role)

  const value = useMemo(() => {
    const user: PortalUser = { ...currentUser, role }
    const allowedClients = clients.filter((c) => user.clientIds.includes(c.id))
    const activeClient =
      allowedClients.find((c) => c.id === activeClientId) ?? allowedClients[0] ?? clients[0]
    const advisor = advisors.find((a) => a.id === activeClient.advisorId) ?? advisors[0]
    const cid = activeClient.id

    return {
      user,
      setUserRole,
      clients: allowedClients,
      activeClientId: cid,
      setActiveClientId,
      activeClient,
      advisor,
      engagement: engagements.find((e) => e.clientId === cid),
      funding: fundingRequests.find((f) => f.clientId === cid),
      projects: projects.filter((p) => p.clientId === cid),
      contacts: contacts.filter((c) => c.clientId === cid && canViewVisibility(role, c.visibility)),
      docs: documentRequests.filter((d) => d.clientId === cid),
      dataRoom: dataRoomDocuments.filter(
        (d) => d.clientId === cid && canViewVisibility(role, d.sensitivity),
      ),
      threads: threads.filter((t) => t.clientId === cid),
      messages,
      tasks: tasks.filter((t) => t.clientId === cid),
      approvals: approvals.filter((a) => a.clientId === cid && canViewVisibility(role, a.visibility)),
      meetings: meetings.filter((m) => m.clientId === cid),
      notifications: notifications.filter((n) => n.clientId === cid),
      files: secureFiles.filter((f) => f.clientId === cid && canViewVisibility(role, f.sensitivity)),
      timeline: timelineEvents.filter((e) => e.clientId === cid),
      milestones: milestones.filter((m) => m.clientId === cid),
      invoices: invoices.filter((i) => i.clientId === cid),
      kpis: kpis.filter((k) => k.clientId === cid),
      roadmap: capitalRoadmap.filter((r) => r.clientId === cid),
      pipeline: pipelineParties.filter((p) => p.clientId === cid),
      notes: notes.filter((n) => n.clientId === cid && canViewVisibility(role, n.visibility)),
      decisions: decisions.filter((d) => d.clientId === cid && canViewVisibility(role, d.visibility)),
      deliverables: deliverables.filter((d) => d.clientId === cid),
      insights: aiInsights.filter((i) => i.clientId === cid && canViewVisibility(role, i.visibility)),
      activity: activityEvents.filter((a) => a.clientId === cid),
      canContribute: canContribute(role),
      canViewInternal: canViewVisibility(role, 'Internal'),
    }
  }, [activeClientId, role])

  return <PortalContext.Provider value={value}>{children}</PortalContext.Provider>
}

export function usePortal() {
  const ctx = useContext(PortalContext)
  if (!ctx) throw new Error('usePortal must be used within PortalProvider')
  return ctx
}

import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import { mockData, roleDashboardAccess } from '../data/mockData'
import type { CommandCenterData, DashboardId, Notification, Role } from '../types'

interface DashboardContextValue {
  data: CommandCenterData
  role: Role
  setRole: (role: Role) => void
  allowedDashboards: DashboardId[]
  visibleNotifications: Notification[]
  unreadCount: number
  markNotificationRead: (notificationId: string) => void
  markAllRead: () => void
}

const DashboardContext = createContext<DashboardContextValue | null>(null)

export function DashboardProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<Role>('Owner')
  const [readIds, setReadIds] = useState(() => new Set(mockData.notifications.filter((item) => item.read).map((item) => item.id)))

  const visibleNotifications = useMemo(
    () =>
      mockData.notifications
        .filter((item) => item.allowedRoles.includes(role))
        .map((item) => ({ ...item, read: readIds.has(item.id) })),
    [readIds, role],
  )

  const value = useMemo<DashboardContextValue>(
    () => ({
      data: mockData,
      role,
      setRole,
      allowedDashboards: roleDashboardAccess[role],
      visibleNotifications,
      unreadCount: visibleNotifications.filter((item) => !item.read).length,
      markNotificationRead: (notificationId) => setReadIds((current) => new Set(current).add(notificationId)),
      markAllRead: () => setReadIds((current) => new Set([...current, ...visibleNotifications.map((item) => item.id)])),
    }),
    [role, visibleNotifications],
  )

  return <DashboardContext.Provider value={value}>{children}</DashboardContext.Provider>
}

export function useDashboard() {
  const value = useContext(DashboardContext)
  if (!value) throw new Error('useDashboard must be used inside DashboardProvider')
  return value
}

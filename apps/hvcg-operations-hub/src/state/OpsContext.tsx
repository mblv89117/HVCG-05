import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import { mockData, roleModuleAccess } from '../data/mockData'
import type { ModuleId, Notification, OperationsData, Role } from '../types'

interface OpsContextValue {
  data: OperationsData
  role: Role
  setRole: (role: Role) => void
  allowedModules: ModuleId[]
  visibleNotifications: Notification[]
  unreadCount: number
  markNotificationRead: (notificationId: string) => void
  markAllRead: () => void
  sopQuery: string
  setSopQuery: (value: string) => void
  sopCategory: string
  setSopCategory: (value: string) => void
  favoriteOnly: boolean
  setFavoriteOnly: (value: boolean) => void
}

const OpsContext = createContext<OpsContextValue | null>(null)

export function OpsProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<Role>('Owner')
  const [readIds, setReadIds] = useState(() => new Set(mockData.notifications.filter((item) => item.read).map((item) => item.id)))
  const [sopQuery, setSopQuery] = useState('')
  const [sopCategory, setSopCategory] = useState('All')
  const [favoriteOnly, setFavoriteOnly] = useState(false)

  const visibleNotifications = useMemo(
    () =>
      mockData.notifications
        .filter((item) => item.allowedRoles.includes(role))
        .map((item) => ({ ...item, read: readIds.has(item.id) })),
    [readIds, role],
  )

  const value = useMemo<OpsContextValue>(
    () => ({
      data: mockData,
      role,
      setRole,
      allowedModules: roleModuleAccess[role],
      visibleNotifications,
      unreadCount: visibleNotifications.filter((item) => !item.read).length,
      markNotificationRead: (notificationId) => setReadIds((current) => new Set(current).add(notificationId)),
      markAllRead: () => setReadIds((current) => new Set([...current, ...visibleNotifications.map((item) => item.id)])),
      sopQuery,
      setSopQuery,
      sopCategory,
      setSopCategory,
      favoriteOnly,
      setFavoriteOnly,
    }),
    [role, visibleNotifications, sopQuery, sopCategory, favoriteOnly],
  )

  return <OpsContext.Provider value={value}>{children}</OpsContext.Provider>
}

export function useOps() {
  const value = useContext(OpsContext)
  if (!value) throw new Error('useOps must be used inside OpsProvider')
  return value
}

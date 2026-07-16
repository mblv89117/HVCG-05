import { Navigate, Outlet } from 'react-router-dom'
import { useOps } from '../state/OpsContext'
import type { ModuleId } from '../types'

export function ProtectedRoute({ module }: { module: ModuleId }) {
  const { allowedModules } = useOps()
  if (!allowedModules.includes(module)) return <Navigate to="/" replace />
  return <Outlet />
}

import type { ReactNode } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './layout/AppShell'
import {
  ApprovalsPage,
  AuditPage,
  CalendarPage,
  EnvironmentsPage,
  EvidencePage,
  IncidentsPage,
  PromotionPage,
  QueuePage,
  ReleaseDashboardPage,
  ReleaseDetailPage,
  RollbackPage,
} from './pages/Pages'
import { DeploymentProvider, useDeployment } from './state/DeploymentContext'
import type { PageId } from './types'
import './styles/app.css'

function Protected({ page, children }: { page: PageId; children: ReactNode }) {
  const { allowedPages } = useDeployment()
  return allowedPages.includes(page) ? children : <Navigate to="/" replace />
}

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<ReleaseDashboardPage />} />
        <Route path="releases/:id" element={<Protected page="dashboard"><ReleaseDetailPage /></Protected>} />
        <Route path="queue" element={<Protected page="queue"><QueuePage /></Protected>} />
        <Route path="promotion" element={<Protected page="promotion"><PromotionPage /></Protected>} />
        <Route path="approvals" element={<Protected page="approvals"><ApprovalsPage /></Protected>} />
        <Route path="evidence" element={<Protected page="evidence"><EvidencePage /></Protected>} />
        <Route path="rollback" element={<Protected page="rollback"><RollbackPage /></Protected>} />
        <Route path="environments" element={<Protected page="environments"><EnvironmentsPage /></Protected>} />
        <Route path="calendar" element={<Protected page="calendar"><CalendarPage /></Protected>} />
        <Route path="incidents" element={<Protected page="incidents"><IncidentsPage /></Protected>} />
        <Route path="audit" element={<Protected page="audit"><AuditPage /></Protected>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

export default function App() {
  return (
    <DeploymentProvider>
      <AppRoutes />
    </DeploymentProvider>
  )
}

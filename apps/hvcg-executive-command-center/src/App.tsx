import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { DashboardProvider, useDashboard } from './state/DashboardContext'
import { IntelligenceProvider } from './state/IntelligenceContext'
import { AppShell } from './layout/AppShell'
import { AiPage, ClientsPage, FinancialPage, NotificationsPage, OperationsPage, OverviewPage, RevenuePage } from './pages/Dashboards'
import {
  CcbBriefingPage,
  DailyIntelligencePage,
  DecisionsPage,
  ExceptionsPage,
  IntelligenceLayout,
  MeetingsPage,
  WeeklyIntelligencePage,
} from './pages/Intelligence'
import type { DashboardId } from './types'
import './styles/dashboard.css'

function Protected({ dashboard, children }: { dashboard: DashboardId; children: React.ReactNode }) {
  const { allowedDashboards } = useDashboard()
  return allowedDashboards.includes(dashboard) ? children : <Navigate to="/" replace />
}

function AppRoutes() {
  return (
    <IntelligenceProvider>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<OverviewPage />} />
          <Route path="revenue" element={<Protected dashboard="revenue"><RevenuePage /></Protected>} />
          <Route path="clients" element={<Protected dashboard="clients"><ClientsPage /></Protected>} />
          <Route path="operations" element={<Protected dashboard="operations"><OperationsPage /></Protected>} />
          <Route path="financial" element={<Protected dashboard="financial"><FinancialPage /></Protected>} />
          <Route path="ai" element={<Protected dashboard="ai"><AiPage /></Protected>} />
          <Route path="intelligence" element={<Protected dashboard="intelligence"><IntelligenceLayout /></Protected>}>
            <Route index element={<DailyIntelligencePage />} />
            <Route path="weekly" element={<WeeklyIntelligencePage />} />
            <Route path="decisions" element={<DecisionsPage />} />
            <Route path="exceptions" element={<ExceptionsPage />} />
            <Route path="meetings" element={<MeetingsPage />} />
            <Route path="ccb" element={<CcbBriefingPage />} />
          </Route>
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </IntelligenceProvider>
  )
}

export default function App() {
  return (
    <DashboardProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </DashboardProvider>
  )
}

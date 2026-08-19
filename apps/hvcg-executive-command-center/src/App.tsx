import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { DashboardProvider } from './state/DashboardContext'
import { AppShell } from './layout/AppShell'
import { AgentPage, ApprovalsPage, BriefPage, EngineeringPage, OverviewPage, PortfolioPage, RevenuePage } from './pages/Dashboards'
import './styles/dashboard.css'

export default function App() {
  return (
    <DashboardProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<AppShell />}>
            <Route index element={<OverviewPage />} />
            <Route path="approvals" element={<ApprovalsPage />} />
            <Route path="agents" element={<AgentPage />} />
            <Route path="portfolio" element={<PortfolioPage />} />
            <Route path="revenue" element={<RevenuePage />} />
            <Route path="engineering" element={<EngineeringPage />} />
            <Route path="brief" element={<BriefPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </DashboardProvider>
  )
}

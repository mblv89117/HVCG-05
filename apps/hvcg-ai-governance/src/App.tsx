import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './layout/AppShell'
import {
  AgentDetailPage,
  AgentsPage,
  ApprovalsPage,
  AuditPage,
  CostsPage,
  HealthPage,
  OverviewPage,
  PermissionsPage,
  PoliciesPage,
  PromptsPage,
  RisksPage,
} from './pages/Pages'
import { GovernanceProvider } from './state/GovernanceContext'

export default function App() {
  return (
    <GovernanceProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<AppShell />}>
            <Route index element={<OverviewPage />} />
            <Route path="agents" element={<AgentsPage />} />
            <Route path="agents/:agentId" element={<AgentDetailPage />} />
            <Route path="prompts" element={<PromptsPage />} />
            <Route path="permissions" element={<PermissionsPage />} />
            <Route path="health" element={<HealthPage />} />
            <Route path="costs" element={<CostsPage />} />
            <Route path="audit" element={<AuditPage />} />
            <Route path="approvals" element={<ApprovalsPage />} />
            <Route path="risks" element={<RisksPage />} />
            <Route path="policies" element={<PoliciesPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </GovernanceProvider>
  )
}

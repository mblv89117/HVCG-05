import type { ReactNode } from 'react';
import { Routes, Route, useParams, Navigate } from 'react-router-dom';
import { MicrosoftAuthProvider } from './microsoft/auth/AuthProvider';
import { WorkspaceProvider } from './state/WorkspaceContext';
import { RoleProvider, useAtlasRole } from './security/RoleProvider';
import { AppShell } from './layout/AppShell';
import { ExecutiveDashboardPage } from './pages/ExecutiveDashboard';
import { AdminPage } from './pages/AdminPage';
import {
  AiInsightsPage,
  CapitalPage,
  ClientDetailPage,
  ClientsPage,
  DocumentsPage,
  EnterpriseValuePage,
  FinancialsPage,
  ProjectsPage,
  RevenuePage,
  TasksPage,
} from './pages/Modules';
import { ProjectDetailPage } from './pages/ProjectDetailPage';
import { NotificationsPage, SettingsPage } from './pages/NotificationsSettings';
import { AccessDeniedPage } from './pages/SystemPages';
import { BankingConnectionsPage } from './pages/BankingConnectionsPage';
import { AccountingConnectionsPage } from './pages/AccountingConnectionsPage';
import { AutomationsPage, KnowledgePage, ReportsPage } from './pages/PlatformModules';

function ClientDetailRoute() {
  const { workspaceId = '' } = useParams();
  const { can } = useAtlasRole();
  if (!can('viewClientDetail')) return <Navigate to="/access-denied" replace />;
  return <ClientDetailPage workspaceId={workspaceId} />;
}

function ProjectDetailRoute() {
  const { projectId = '' } = useParams();
  return <ProjectDetailPage projectId={projectId} />;
}

function AdminRoute() {
  const { can } = useAtlasRole();
  if (!can('viewAdmin')) return <Navigate to="/access-denied" replace />;
  return <AdminPage />;
}

function FinanceRoute({ children }: { children: ReactNode }) {
  const { can } = useAtlasRole();
  if (!can('viewFinance')) return <Navigate to="/access-denied" replace />;
  return children;
}

function ClientsRoute({ children }: { children: ReactNode }) {
  const { can, role } = useAtlasRole();
  if (role === 'Unauthenticated') return children;
  if (!can('viewClients')) return <Navigate to="/access-denied" replace />;
  return children;
}

function HomeRoute() {
  const { can, role } = useAtlasRole();
  if (role === 'Unauthenticated') return <ExecutiveDashboardPage />;
  if (role === 'Unresolved') return <Navigate to="/access-denied" replace />;
  if (!can('viewExecutiveHome') && can('viewClients')) return <Navigate to="/clients" replace />;
  if (!can('viewExecutiveHome')) return <Navigate to="/access-denied" replace />;
  return <ExecutiveDashboardPage />;
}

export function App() {
  return (
    <MicrosoftAuthProvider>
      <RoleProvider>
        <WorkspaceProvider>
          <Routes>
            <Route element={<AppShell />}>
              <Route index element={<HomeRoute />} />
              <Route path="executive" element={<HomeRoute />} />
              <Route
                path="financials"
                element={
                  <FinanceRoute>
                    <FinancialsPage />
                  </FinanceRoute>
                }
              />
              <Route
                path="revenue"
                element={
                  <FinanceRoute>
                    <RevenuePage />
                  </FinanceRoute>
                }
              />
              <Route
                path="clients"
                element={
                  <ClientsRoute>
                    <ClientsPage />
                  </ClientsRoute>
                }
              />
              <Route path="clients/:workspaceId" element={<ClientDetailRoute />} />
              <Route path="projects" element={<ProjectsPage />} />
              <Route path="projects/:projectId" element={<ProjectDetailRoute />} />
              <Route path="tasks" element={<TasksPage />} />
              <Route
                path="capital"
                element={
                  <FinanceRoute>
                    <CapitalPage />
                  </FinanceRoute>
                }
              />
              <Route
                path="enterprise-value"
                element={
                  <FinanceRoute>
                    <EnterpriseValuePage />
                  </FinanceRoute>
                }
              />
              <Route path="documents" element={<DocumentsPage />} />
              <Route
                path="banking"
                element={
                  <FinanceRoute>
                    <BankingConnectionsPage />
                  </FinanceRoute>
                }
              />
              <Route
                path="accounting"
                element={
                  <FinanceRoute>
                    <AccountingConnectionsPage />
                  </FinanceRoute>
                }
              />
              <Route path="knowledge" element={<KnowledgePage />} />
              <Route path="automations" element={<AutomationsPage />} />
              <Route path="reports" element={<ReportsPage />} />
              <Route path="ai" element={<AiInsightsPage />} />
              <Route path="notifications" element={<NotificationsPage />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="admin" element={<AdminRoute />} />
              <Route path="access-denied" element={<AccessDeniedPage />} />
            </Route>
          </Routes>
        </WorkspaceProvider>
      </RoleProvider>
    </MicrosoftAuthProvider>
  );
}

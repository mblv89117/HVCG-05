import { Routes, Route, useParams, Navigate } from 'react-router-dom';
import { MicrosoftAuthProvider } from './microsoft/auth/AuthProvider';
import { WorkspaceProvider } from './state/WorkspaceContext';
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
import { OpportunityDetailPage } from './pages/OpportunityDetailPage';
import { ClientMigrationPage } from './pages/ClientMigrationPage';
import { NotificationsPage, SettingsPage } from './pages/NotificationsSettings';
import {
  AccessDeniedPage,
  EmptyDemoPage,
  ErrorPage,
  LoadingDemoPage,
} from './pages/SystemPages';
import { canAccessAdmin, canAccessRevenue } from './security/rbac';

function ClientDetailRoute() {
  const { workspaceId = '' } = useParams();
  return <ClientDetailPage workspaceId={workspaceId} />;
}

function ProjectDetailRoute() {
  const { projectId = '' } = useParams();
  return <ProjectDetailPage projectId={projectId} />;
}

function OpportunityDetailRoute() {
  const { opportunityId = '' } = useParams();
  return <OpportunityDetailPage opportunityId={opportunityId} />;
}

function AdminRoute() {
  if (!canAccessAdmin()) return <Navigate to="/access-denied" replace />;
  return <AdminPage />;
}

function RevenueRoute() {
  if (!canAccessRevenue()) return <Navigate to="/access-denied" replace />;
  return <RevenuePage />;
}

function RevenueOpportunityRoute() {
  if (!canAccessRevenue()) return <Navigate to="/access-denied" replace />;
  return <OpportunityDetailRoute />;
}

function RevenueMigrationRoute() {
  if (!canAccessRevenue()) return <Navigate to="/access-denied" replace />;
  return <ClientMigrationPage />;
}

export function App() {
  return (
    <MicrosoftAuthProvider>
      <WorkspaceProvider>
        <Routes>
          <Route element={<AppShell />}>
            <Route index element={<ExecutiveDashboardPage />} />
            <Route path="financials" element={<FinancialsPage />} />
            <Route path="revenue" element={<RevenueRoute />} />
            <Route path="revenue/opportunities/:opportunityId" element={<RevenueOpportunityRoute />} />
            <Route path="revenue/migrations" element={<RevenueMigrationRoute />} />
            <Route path="clients" element={<ClientsPage />} />
            <Route path="clients/:workspaceId" element={<ClientDetailRoute />} />
            <Route path="projects" element={<ProjectsPage />} />
            <Route path="projects/:projectId" element={<ProjectDetailRoute />} />
            <Route path="tasks" element={<TasksPage />} />
            <Route path="capital" element={<CapitalPage />} />
            <Route path="enterprise-value" element={<EnterpriseValuePage />} />
            <Route path="documents" element={<DocumentsPage />} />
            <Route path="ai" element={<AiInsightsPage />} />
            <Route path="notifications" element={<NotificationsPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="admin" element={<AdminRoute />} />
            <Route path="access-denied" element={<AccessDeniedPage />} />
            <Route path="error" element={<ErrorPage />} />
            <Route path="empty" element={<EmptyDemoPage />} />
            <Route path="loading" element={<LoadingDemoPage />} />
          </Route>
        </Routes>
      </WorkspaceProvider>
    </MicrosoftAuthProvider>
  );
}

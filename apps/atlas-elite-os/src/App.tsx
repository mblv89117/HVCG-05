import { Routes, Route, useParams } from 'react-router-dom';
import { MicrosoftAuthProvider } from './microsoft/auth/AuthProvider';
import { RoleProvider } from './security/RoleProvider';
import { WorkspaceProvider } from './state/WorkspaceContext';
import { AppShell } from './layout/AppShell';
import { ExecutiveDashboardPage } from './pages/ExecutiveDashboard';
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
import { CommunicationsPage } from './pages/CommunicationsPage';
import {
  AccessDeniedPage,
  EmptyDemoPage,
  ErrorPage,
  LoadingDemoPage,
} from './pages/SystemPages';
import {
  AdminLayout,
  AdminHubPage,
  AreaRoute,
  UserDetailPage,
  RoleDetailPage,
} from './admin';

function ClientDetailRoute() {
  const { workspaceId = '' } = useParams();
  return <ClientDetailPage workspaceId={workspaceId} />;
}

function ProjectDetailRoute() {
  const { projectId = '' } = useParams();
  return <ProjectDetailPage projectId={projectId} />;
}

export function App() {
  return (
    <MicrosoftAuthProvider>
      <RoleProvider>
        <WorkspaceProvider>
          <Routes>
            <Route element={<AppShell />}>
              <Route index element={<ExecutiveDashboardPage />} />
              <Route path="financials" element={<FinancialsPage />} />
              <Route path="revenue" element={<RevenuePage />} />
              <Route path="clients" element={<ClientsPage />} />
              <Route path="clients/:workspaceId" element={<ClientDetailRoute />} />
              <Route path="projects" element={<ProjectsPage />} />
              <Route path="projects/:projectId" element={<ProjectDetailRoute />} />
              <Route path="tasks" element={<TasksPage />} />
              <Route path="capital" element={<CapitalPage />} />
              <Route path="enterprise-value" element={<EnterpriseValuePage />} />
              <Route path="documents" element={<DocumentsPage />} />
              <Route path="communications" element={<CommunicationsPage />} />
              <Route path="ai" element={<AiInsightsPage />} />
              <Route path="notifications" element={<NotificationsPage />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="admin" element={<AdminLayout />}>
                <Route index element={<AdminHubPage />} />
                <Route path="users/:userId" element={<UserDetailPage />} />
                <Route path="roles/:roleId" element={<RoleDetailPage />} />
                <Route path=":areaId" element={<AreaRoute />} />
              </Route>
              <Route path="access-denied" element={<AccessDeniedPage />} />
              <Route path="error" element={<ErrorPage />} />
              <Route path="empty" element={<EmptyDemoPage />} />
              <Route path="loading" element={<LoadingDemoPage />} />
            </Route>
          </Routes>
        </WorkspaceProvider>
      </RoleProvider>
    </MicrosoftAuthProvider>
  );
}

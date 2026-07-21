import type { ReactNode } from 'react';
import { Routes, Route, useParams, Navigate } from 'react-router-dom';
import { Button, MessageBar, MessageBarBody, MessageBarTitle } from '@fluentui/react-components';
import { MicrosoftAuthProvider, useMicrosoftAuth } from './microsoft/auth/AuthProvider';
import { WorkspaceProvider } from './state/WorkspaceContext';
import { RoleProvider, useAtlasRole } from './security/RoleProvider';
import { AppShell } from './layout/AppShell';
import { ExecutiveDashboardPage } from './pages/ExecutiveDashboard';
import { CommandCenterPage } from './pages/CommandCenterPage';
import { MyWorkPage } from './pages/MyWorkPage';
import { PortfolioPage } from './pages/PortfolioPage';
import { UniversalInboxPage, TeamAgentsPage } from './pages/OperatingSystemPages';
import { AdminPage } from './pages/AdminPage';
import {
  AiInsightsPage,
  CapitalPage,
  ClientDetailPage as DemoClientDetailPage,
  DocumentsPage,
  EnterpriseValuePage,
  FinancialsPage,
  ProjectsPage,
  RevenuePage,
  TasksPage,
} from './pages/Modules';
import { ClientsPage } from './pages/LiveClientsPage';
import { LiveClientDetailPage } from './pages/LiveClientDetailPage';
import { ProjectDetailPage } from './pages/ProjectDetailPage';
import { NotificationsPage, SettingsPage } from './pages/NotificationsSettings';
import { AccessDeniedPage } from './pages/SystemPages';
import { BankingConnectionsPage } from './pages/BankingConnectionsPage';
import { AccountingConnectionsPage } from './pages/AccountingConnectionsPage';
import { ConnectionsCenterPage } from './pages/ConnectionsCenterPage';
import { AutomationsPage, KnowledgePage, ReportsPage } from './pages/PlatformModules';
import { ModuleScaffold } from './pages/shared/ModuleScaffold';

function ClientDetailRoute() {
  const { workspaceId = '' } = useParams();
  const { can, role } = useAtlasRole();
  // Match ClientsRoute: allow unauthenticated read of Live Client 360 (snapshot/hub).
  if (role !== 'Unauthenticated' && !can('viewClientDetail')) {
    return <Navigate to="/access-denied" replace />;
  }
  // Prefer live Client 360 IDs; demo catalog detail remains at /clients/demo/:id
  if (workspaceId.startsWith('demo-') || workspaceId.startsWith('ws-')) {
    return <DemoClientDetailPage workspaceId={workspaceId} />;
  }
  return <LiveClientDetailPage clientId={workspaceId} />;
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

function ConnectionsRoute() {
  const { can, role } = useAtlasRole();
  const { activateDevOwner, devOwnerLoginAllowed } = useMicrosoftAuth();
  if (!can('viewAdmin')) {
    return (
      <ModuleScaffold
        title="Connections Center"
        subtitle="Owner / Administrator access required"
        showPendingBanner={false}
      >
        <MessageBar intent="warning">
          <MessageBarBody>
            <MessageBarTitle>
              {role === 'Unauthenticated' ? 'Sign-in required' : 'Insufficient permissions'}
            </MessageBarTitle>
            {role === 'Unauthenticated'
              ? 'Connections is blank until you activate Local Owner (Dev) or sign in as HVCG Owner. The top-right company dropdown only switches client workspace — it does not grant access.'
              : `Role "${role}" cannot manage integrations. Use an HVCG Owner or Administrator account.`}
          </MessageBarBody>
        </MessageBar>
        {role === 'Unauthenticated' && devOwnerLoginAllowed ? (
          <Button
            appearance="primary"
            onClick={() => {
              activateDevOwner();
            }}
          >
            Continue as Local Owner (Dev)
          </Button>
        ) : null}
      </ModuleScaffold>
    );
  }
  return <ConnectionsCenterPage />;
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
  if (role === 'Unauthenticated') return <CommandCenterPage />;
  if (role === 'Unresolved') return <Navigate to="/access-denied" replace />;
  if (!can('viewExecutiveHome') && can('viewClients')) return <Navigate to="/clients" replace />;
  if (!can('viewExecutiveHome')) return <Navigate to="/access-denied" replace />;
  return <CommandCenterPage />;
}

export function App() {
  return (
    <MicrosoftAuthProvider>
      <RoleProvider>
        <WorkspaceProvider>
          <Routes>
            <Route element={<AppShell />}>
              <Route index element={<HomeRoute />} />
              <Route path="executive" element={<ExecutiveDashboardPage />} />
              <Route path="command-center" element={<HomeRoute />} />
              <Route path="my-work" element={<MyWorkPage />} />
              <Route path="portfolio" element={<PortfolioPage />} />
              <Route path="inbox" element={<UniversalInboxPage />} />
              <Route path="team" element={<TeamAgentsPage />} />
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
              <Route path="connections" element={<ConnectionsRoute />} />
              <Route path="admin" element={<AdminRoute />} />
              <Route path="access-denied" element={<AccessDeniedPage />} />
            </Route>
          </Routes>
        </WorkspaceProvider>
      </RoleProvider>
    </MicrosoftAuthProvider>
  );
}

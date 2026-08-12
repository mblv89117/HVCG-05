import type { ReactNode } from 'react';
import { Routes, Route, useParams, Navigate } from 'react-router-dom';
import { Button, MessageBar, MessageBarBody, MessageBarTitle } from '@fluentui/react-components';
import { MicrosoftAuthProvider, useMicrosoftAuth } from './microsoft/auth/AuthProvider';
import { WorkspaceProvider } from './state/WorkspaceContext';
import { RoleProvider, useAtlasRole } from './security/RoleProvider';
import { RequireMicrosoftAuth } from './security/RequireMicrosoftAuth';
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
  ProcurementPage,
  RiskPage,
  GrowthPage,
  ClientDetailPage as DemoClientDetailPage,
  EnterpriseValuePage,
  FinancialsPage,
  RevenuePage,
  TasksPage,
} from './pages/Modules';
import { DocumentsOperatingPage } from './pages/DocumentsOperatingPage';
import { DocumentLifecycleWorkbench } from './pages/DocumentLifecycleWorkbench';
import { ExecutiveOwnerSupportWorkbench } from './pages/ExecutiveOwnerSupportWorkbench';
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
import { isValidProjectId } from './routing/projectId';

function ClientDetailRoute() {
  const { workspaceId = '' } = useParams();
  // Prefer live Client 360 IDs; demo catalog detail remains at /clients/demo/:id
  if (workspaceId.startsWith('demo-') || workspaceId.startsWith('ws-')) {
    return <DemoClientDetailPage workspaceId={workspaceId} />;
  }
  return <LiveClientDetailPage clientId={workspaceId} />;
}

function ProjectDetailRoute() {
  const { projectId = '' } = useParams();
  if (!isValidProjectId(projectId)) {
    return <ProjectDetailPage projectId={projectId} invalidId />;
  }
  return <ProjectDetailPage projectId={projectId} />;
}

function FinanceRoute({ children }: { children: ReactNode }) {
  return <RequireMicrosoftAuth capability="viewFinance">{children}</RequireMicrosoftAuth>;
}

function AdminRoute() {
  return (
    <RequireMicrosoftAuth capability="viewAdmin">
      <AdminPage />
    </RequireMicrosoftAuth>
  );
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

function ClientsRoute({ children }: { children: ReactNode }) {
  return <RequireMicrosoftAuth capability="viewClients">{children}</RequireMicrosoftAuth>;
}

function ClientDetailAuthRoute({ children }: { children: ReactNode }) {
  return <RequireMicrosoftAuth capability="viewClientDetail">{children}</RequireMicrosoftAuth>;
}

function PrivateRoute({ children }: { children: ReactNode }) {
  return <RequireMicrosoftAuth>{children}</RequireMicrosoftAuth>;
}

function HomeRoute() {
  const { can, role } = useAtlasRole();
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
              <Route
                index
                element={
                  <PrivateRoute>
                    <HomeRoute />
                  </PrivateRoute>
                }
              />
              <Route
                path="executive"
                element={
                  <PrivateRoute>
                    <ExecutiveDashboardPage />
                  </PrivateRoute>
                }
              />
              <Route
                path="owner-support"
                element={
                  <PrivateRoute>
                    <ExecutiveOwnerSupportWorkbench />
                  </PrivateRoute>
                }
              />
              <Route
                path="command-center"
                element={
                  <PrivateRoute>
                    <HomeRoute />
                  </PrivateRoute>
                }
              />
              <Route
                path="my-work"
                element={
                  <PrivateRoute>
                    <MyWorkPage />
                  </PrivateRoute>
                }
              />
              <Route
                path="portfolio"
                element={
                  <PrivateRoute>
                    <PortfolioPage />
                  </PrivateRoute>
                }
              />
              <Route
                path="inbox"
                element={
                  <PrivateRoute>
                    <UniversalInboxPage />
                  </PrivateRoute>
                }
              />
              <Route
                path="team"
                element={
                  <PrivateRoute>
                    <TeamAgentsPage />
                  </PrivateRoute>
                }
              />
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
              <Route
                path="clients/:workspaceId"
                element={
                  <ClientDetailAuthRoute>
                    <ClientDetailRoute />
                  </ClientDetailAuthRoute>
                }
              />
              <Route
                path="projects"
                element={
                  <PrivateRoute>
                    <PortfolioPage />
                  </PrivateRoute>
                }
              />
              <Route
                path="projects/:projectId"
                element={
                  <PrivateRoute>
                    <ProjectDetailRoute />
                  </PrivateRoute>
                }
              />
              <Route
                path="tasks"
                element={
                  <PrivateRoute>
                    <TasksPage />
                  </PrivateRoute>
                }
              />
              <Route
                path="capital"
                element={
                  <FinanceRoute>
                    <CapitalPage />
                  </FinanceRoute>
                }
              />
              <Route
                path="procurement"
                element={
                  <PrivateRoute>
                    <ProcurementPage />
                  </PrivateRoute>
                }
              />
              <Route
                path="risk"
                element={
                  <PrivateRoute>
                    <RiskPage />
                  </PrivateRoute>
                }
              />
              <Route
                path="growth"
                element={
                  <PrivateRoute>
                    <GrowthPage />
                  </PrivateRoute>
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
              <Route
                path="documents"
                element={
                  <PrivateRoute>
                    <DocumentLifecycleWorkbench />
                  </PrivateRoute>
                }
              />
              <Route
                path="documents/operating"
                element={
                  <PrivateRoute>
                    <DocumentsOperatingPage />
                  </PrivateRoute>
                }
              />
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
              <Route
                path="knowledge"
                element={
                  <PrivateRoute>
                    <KnowledgePage />
                  </PrivateRoute>
                }
              />
              <Route
                path="automations"
                element={
                  <PrivateRoute>
                    <AutomationsPage />
                  </PrivateRoute>
                }
              />
              <Route
                path="reports"
                element={
                  <PrivateRoute>
                    <ReportsPage />
                  </PrivateRoute>
                }
              />
              <Route
                path="ai"
                element={
                  <PrivateRoute>
                    <AiInsightsPage />
                  </PrivateRoute>
                }
              />
              <Route
                path="notifications"
                element={
                  <PrivateRoute>
                    <NotificationsPage />
                  </PrivateRoute>
                }
              />
              <Route
                path="settings"
                element={
                  <PrivateRoute>
                    <SettingsPage />
                  </PrivateRoute>
                }
              />
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

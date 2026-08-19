import type { ReactNode } from 'react';
import { Routes, Route, useParams, Navigate } from 'react-router-dom';
import { MicrosoftAuthProvider } from './microsoft/auth/AuthProvider';
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
  AutomationsDeferredPage,
  CapitalPage,
  ProcurementPage,
  RiskPage,
  GrowthPage,
  ClientDetailPage as DemoClientDetailPage,
  EnterpriseValuePage,
  FinancialsPage,
  NotificationsDeferredPage,
  ReportsDeferredPage,
  RevenuePage,
  TasksPage,
} from './pages/Modules';
import { DocumentsOperatingPage } from './pages/DocumentsOperatingPage';
import { ExecutiveOwnerSupportWorkbench } from './pages/ExecutiveOwnerSupportWorkbench';
import { ClientsPage } from './pages/LiveClientsPage';
import { ClientIntakeWorkbench } from './pages/ClientIntakeWorkbench';
import { LiveClientDetailPage } from './pages/LiveClientDetailPage';
import { LeadsPage } from './pages/LeadsPage';
import { LeadDetailPage } from './pages/LeadDetailPage';
import { OpportunityDetailPage } from './pages/OpportunityDetailPage';
import { ProjectDetailPage } from './pages/ProjectDetailPage';
import { SettingsPage } from './pages/NotificationsSettings';
import { AccessDeniedPage, NotFoundPage } from './pages/SystemPages';
import { BankingConnectionsPage } from './pages/BankingConnectionsPage';
import { AccountingConnectionsPage } from './pages/AccountingConnectionsPage';
import { ConnectionsCenterPage } from './pages/ConnectionsCenterPage';
import { KnowledgePage } from './pages/PlatformModules';
import { isValidProjectId } from './routing/projectId';

function ClientDetailRoute() {
  const { workspaceId = '' } = useParams();
  // Never treat the intake path segment as a client/workspace id.
  if (workspaceId === 'intake') {
    return <Navigate to="/clients/intake" replace />;
  }
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

function AdminRoute({ children }: { children: ReactNode }) {
  return <RequireMicrosoftAuth capability="viewAdmin">{children}</RequireMicrosoftAuth>;
}

function ClientsRoute({ children }: { children: ReactNode }) {
  return <RequireMicrosoftAuth capability="viewClients">{children}</RequireMicrosoftAuth>;
}

function LeadsRoute({ children }: { children: ReactNode }) {
  return <RequireMicrosoftAuth capability="viewCrmLeads">{children}</RequireMicrosoftAuth>;
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
              <Route path="command-center" element={<Navigate to="/" replace />} />
              <Route
                path="my-work"
                element={
                  <PrivateRoute>
                    <MyWorkPage />
                  </PrivateRoute>
                }
              />
              <Route path="portfolio" element={<Navigate to="/projects" replace />} />
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
                path="leads"
                element={
                  <LeadsRoute>
                    <LeadsPage />
                  </LeadsRoute>
                }
              />
              <Route
                path="leads/:leadId"
                element={
                  <LeadsRoute>
                    <LeadDetailPage />
                  </LeadsRoute>
                }
              />
              <Route
                path="opportunities/:opportunityId"
                element={
                  <LeadsRoute>
                    <OpportunityDetailPage />
                  </LeadsRoute>
                }
              />
              <Route
                path="clients/intake"
                element={
                  <ClientsRoute>
                    <ClientIntakeWorkbench />
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
              <Route path="documents" element={<Navigate to="/documents/operating" replace />} />
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
                    <AutomationsDeferredPage />
                  </PrivateRoute>
                }
              />
              <Route
                path="reports"
                element={
                  <PrivateRoute>
                    <ReportsDeferredPage />
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
                    <NotificationsDeferredPage />
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
              <Route
                path="connections"
                element={
                  <AdminRoute>
                    <ConnectionsCenterPage />
                  </AdminRoute>
                }
              />
              <Route
                path="admin"
                element={
                  <AdminRoute>
                    <AdminPage />
                  </AdminRoute>
                }
              />
              <Route path="access-denied" element={<AccessDeniedPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Route>
          </Routes>
        </WorkspaceProvider>
      </RoleProvider>
    </MicrosoftAuthProvider>
  );
}

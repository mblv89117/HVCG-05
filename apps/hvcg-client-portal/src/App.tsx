import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { PortalProvider } from './state/PortalContext'
import { AppShell } from './layout/AppShell'
import { HomePage } from './pages/HomePage'
import { ExecutiveSummaryPage } from './pages/ExecutiveSummaryPage'
import { ContactsPage } from './pages/ContactsPage'
import { EngagementPage } from './pages/EngagementPage'
import { ProjectsPage } from './pages/ProjectsPage'
import { MilestonesPage } from './pages/MilestonesPage'
import { TasksPage } from './pages/TasksPage'
import { ApprovalsPage } from './pages/ApprovalsPage'
import { DeliverablesPage } from './pages/DeliverablesPage'
import { KpisPage } from './pages/KpisPage'
import { CapitalRoadmapPage } from './pages/CapitalRoadmapPage'
import { PipelinePage } from './pages/PipelinePage'
import { EnterpriseValuePage } from './pages/EnterpriseValuePage'
import { FundingPage } from './pages/FundingPage'
import { DataRoomPage } from './pages/DataRoomPage'
import { DocumentsPage } from './pages/DocumentsPage'
import { FilesPage } from './pages/FilesPage'
import { MeetingsPage } from './pages/MeetingsPage'
import { NotesPage } from './pages/NotesPage'
import { DecisionsPage } from './pages/DecisionsPage'
import { MessagesPage } from './pages/MessagesPage'
import { AdvisorPage } from './pages/AdvisorPage'
import { AiInsightsPage } from './pages/AiInsightsPage'
import { ActivityPage } from './pages/ActivityPage'
import { TimelinePage } from './pages/TimelinePage'
import { NotificationsPage } from './pages/NotificationsPage'
import { InvoicesPage } from './pages/InvoicesPage'
import './styles/portal.css'

export default function App() {
  return (
    <PortalProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<AppShell />}>
            <Route index element={<HomePage />} />
            <Route path="summary" element={<ExecutiveSummaryPage />} />
            <Route path="contacts" element={<ContactsPage />} />
            <Route path="engagement" element={<EngagementPage />} />
            <Route path="projects" element={<ProjectsPage />} />
            <Route path="milestones" element={<MilestonesPage />} />
            <Route path="tasks" element={<TasksPage />} />
            <Route path="approvals" element={<ApprovalsPage />} />
            <Route path="deliverables" element={<DeliverablesPage />} />
            <Route path="kpis" element={<KpisPage />} />
            <Route path="capital" element={<CapitalRoadmapPage />} />
            <Route path="pipeline" element={<PipelinePage />} />
            <Route path="enterprise-value" element={<EnterpriseValuePage />} />
            <Route path="funding" element={<FundingPage />} />
            <Route path="data-room" element={<DataRoomPage />} />
            <Route path="documents" element={<DocumentsPage />} />
            <Route path="files" element={<FilesPage />} />
            <Route path="meetings" element={<MeetingsPage />} />
            <Route path="notes" element={<NotesPage />} />
            <Route path="decisions" element={<DecisionsPage />} />
            <Route path="messages" element={<MessagesPage />} />
            <Route path="advisor" element={<AdvisorPage />} />
            <Route path="ai-insights" element={<AiInsightsPage />} />
            <Route path="activity" element={<ActivityPage />} />
            <Route path="timeline" element={<TimelinePage />} />
            <Route path="notifications" element={<NotificationsPage />} />
            <Route path="invoices" element={<InvoicesPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </PortalProvider>
  )
}

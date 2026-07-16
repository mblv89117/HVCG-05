import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { PortalProvider } from './state/PortalContext'
import { AppShell } from './layout/AppShell'
import { HomePage } from './pages/HomePage'
import { EngagementPage } from './pages/EngagementPage'
import { FundingPage } from './pages/FundingPage'
import { DocumentsPage } from './pages/DocumentsPage'
import { MessagesPage } from './pages/MessagesPage'
import { TasksPage } from './pages/TasksPage'
import { MeetingsPage } from './pages/MeetingsPage'
import { AdvisorPage } from './pages/AdvisorPage'
import { FilesPage } from './pages/FilesPage'
import './styles/portal.css'

export default function App() {
  return (
    <PortalProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<AppShell />}>
            <Route index element={<HomePage />} />
            <Route path="engagement" element={<EngagementPage />} />
            <Route path="funding" element={<FundingPage />} />
            <Route path="documents" element={<DocumentsPage />} />
            <Route path="messages" element={<MessagesPage />} />
            <Route path="tasks" element={<TasksPage />} />
            <Route path="meetings" element={<MeetingsPage />} />
            <Route path="advisor" element={<AdvisorPage />} />
            <Route path="files" element={<FilesPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </PortalProvider>
  )
}

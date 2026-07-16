import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './layout/AppShell'
import { ProtectedRoute } from './layout/ProtectedRoute'
import { AiWorkforcePage } from './pages/AiWorkforcePage'
import { HumanWorkforcePage } from './pages/HumanWorkforcePage'
import { NotificationsPage } from './pages/NotificationsPage'
import { OperationsPage } from './pages/OperationsPage'
import { ProjectsPage } from './pages/ProjectsPage'
import { SopPage } from './pages/SopPage'
import { TeamPage } from './pages/TeamPage'
import { OpsProvider } from './state/OpsContext'
import './styles/operations.css'

export default function App() {
  return (
    <OpsProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<AppShell />}>
            <Route index element={<OperationsPage />} />
            <Route element={<ProtectedRoute module="team" />}>
              <Route path="team" element={<TeamPage />} />
            </Route>
            <Route element={<ProtectedRoute module="projects" />}>
              <Route path="projects" element={<ProjectsPage />} />
            </Route>
            <Route element={<ProtectedRoute module="sop" />}>
              <Route path="sop" element={<SopPage />} />
            </Route>
            <Route element={<ProtectedRoute module="ai" />}>
              <Route path="ai" element={<AiWorkforcePage />} />
            </Route>
            <Route element={<ProtectedRoute module="human" />}>
              <Route path="human" element={<HumanWorkforcePage />} />
            </Route>
            <Route element={<ProtectedRoute module="notifications" />}>
              <Route path="notifications" element={<NotificationsPage />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </OpsProvider>
  )
}

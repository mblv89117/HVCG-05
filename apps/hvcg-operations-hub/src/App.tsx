import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './layout/AppShell'
import { ProtectedRoute } from './layout/ProtectedRoute'
import { AiWorkforcePage } from './pages/AiWorkforcePage'
import { AssetsPage } from './pages/AssetsPage'
import { CalendarArchitecturePage } from './pages/CalendarArchitecturePage'
import { CompanyKpisPage } from './pages/CompanyKpisPage'
import { DocumentationPage } from './pages/DocumentationPage'
import { ExecutivePage } from './pages/ExecutivePage'
import { HiringPage } from './pages/HiringPage'
import { HrPage } from './pages/HrPage'
import { HumanWorkforcePage } from './pages/HumanWorkforcePage'
import { MeetingCenterPage } from './pages/MeetingCenterPage'
import { NotificationsPage } from './pages/NotificationsPage'
import { OperationsPage } from './pages/OperationsPage'
import { ProjectsPage } from './pages/ProjectsPage'
import { QuarterlyPlanningPage } from './pages/QuarterlyPlanningPage'
import { ScorecardsPage } from './pages/ScorecardsPage'
import { SopPage } from './pages/SopPage'
import { TeamPage } from './pages/TeamPage'
import { TrainingPage } from './pages/TrainingPage'
import { VendorsPage } from './pages/VendorsPage'
import { WeeklyReviewsPage } from './pages/WeeklyReviewsPage'
import { PortfolioPage } from './pages/PortfolioPage'
import { ProjectDetailPage } from './pages/ProjectDetailPage'
import { OpsProvider } from './state/OpsContext'
import { ProductProvider } from './state/ProductContext'
import './styles/operations.css'

export default function App() {
  return (
    <OpsProvider>
      <ProductProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<AppShell />}>
            <Route index element={<OperationsPage />} />
            <Route element={<ProtectedRoute module="portfolio" />}>
              <Route path="portfolio" element={<PortfolioPage />} />
              <Route path="portfolio/:projectId" element={<ProjectDetailPage />} />
            </Route>
            <Route element={<ProtectedRoute module="executive" />}>
              <Route path="executive" element={<ExecutivePage />} />
            </Route>
            <Route element={<ProtectedRoute module="scorecards" />}>
              <Route path="scorecards" element={<ScorecardsPage />} />
            </Route>
            <Route element={<ProtectedRoute module="weekly" />}>
              <Route path="weekly" element={<WeeklyReviewsPage />} />
            </Route>
            <Route element={<ProtectedRoute module="quarterly" />}>
              <Route path="quarterly" element={<QuarterlyPlanningPage />} />
            </Route>
            <Route element={<ProtectedRoute module="kpis" />}>
              <Route path="kpis" element={<CompanyKpisPage />} />
            </Route>
            <Route element={<ProtectedRoute module="meetings" />}>
              <Route path="meetings" element={<MeetingCenterPage />} />
            </Route>
            <Route element={<ProtectedRoute module="sop" />}>
              <Route path="sop" element={<SopPage />} />
            </Route>
            <Route element={<ProtectedRoute module="hr" />}>
              <Route path="hr" element={<HrPage />} />
            </Route>
            <Route element={<ProtectedRoute module="hiring" />}>
              <Route path="hiring" element={<HiringPage />} />
            </Route>
            <Route element={<ProtectedRoute module="training" />}>
              <Route path="training" element={<TrainingPage />} />
            </Route>
            <Route element={<ProtectedRoute module="vendors" />}>
              <Route path="vendors" element={<VendorsPage />} />
            </Route>
            <Route element={<ProtectedRoute module="assets" />}>
              <Route path="assets" element={<AssetsPage />} />
            </Route>
            <Route element={<ProtectedRoute module="notifications" />}>
              <Route path="notifications" element={<NotificationsPage />} />
            </Route>
            <Route element={<ProtectedRoute module="calendar" />}>
              <Route path="calendar" element={<CalendarArchitecturePage />} />
            </Route>
            <Route element={<ProtectedRoute module="docs" />}>
              <Route path="docs" element={<DocumentationPage />} />
            </Route>
            <Route element={<ProtectedRoute module="team" />}>
              <Route path="team" element={<TeamPage />} />
            </Route>
            <Route element={<ProtectedRoute module="projects" />}>
              <Route path="projects" element={<ProjectsPage />} />
            </Route>
            <Route element={<ProtectedRoute module="ai" />}>
              <Route path="ai" element={<AiWorkforcePage />} />
            </Route>
            <Route element={<ProtectedRoute module="human" />}>
              <Route path="human" element={<HumanWorkforcePage />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
      </ProductProvider>
    </OpsProvider>
  )
}

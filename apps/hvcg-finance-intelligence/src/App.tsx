import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './layout/AppShell'
import { ChangesPage, DecisionsPage, ScoresPage } from './pages/DecisionPages'
import {
  AiPage,
  AlertsPage,
  BudgetPage,
  CapitalPage,
  CashPage,
  EnterpriseValuePage,
  ForecastPage,
  GovernancePage,
  OverviewPage,
  Protected,
  TrendsPage,
  WorkingCapitalPage,
  WorkspacesPage,
} from './pages/Pages'
import { FinanceProvider } from './state/FinanceContext'
import './styles/finance.css'

export default function App() {
  return (
    <FinanceProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<AppShell />}>
            <Route index element={<OverviewPage />} />
            <Route
              path="decisions"
              element={
                <Protected route="decisions">
                  <DecisionsPage />
                </Protected>
              }
            />
            <Route
              path="changes"
              element={
                <Protected route="changes">
                  <ChangesPage />
                </Protected>
              }
            />
            <Route
              path="scores"
              element={
                <Protected route="scores">
                  <ScoresPage />
                </Protected>
              }
            />
            <Route
              path="trends"
              element={
                <Protected route="trends">
                  <TrendsPage />
                </Protected>
              }
            />
            <Route
              path="cash"
              element={
                <Protected route="cash">
                  <CashPage />
                </Protected>
              }
            />
            <Route
              path="working-capital"
              element={
                <Protected route="working-capital">
                  <WorkingCapitalPage />
                </Protected>
              }
            />
            <Route
              path="budget"
              element={
                <Protected route="budget">
                  <BudgetPage />
                </Protected>
              }
            />
            <Route
              path="forecast"
              element={
                <Protected route="forecast">
                  <ForecastPage />
                </Protected>
              }
            />
            <Route
              path="enterprise-value"
              element={
                <Protected route="enterprise-value">
                  <EnterpriseValuePage />
                </Protected>
              }
            />
            <Route
              path="workspaces"
              element={
                <Protected route="workspaces">
                  <WorkspacesPage />
                </Protected>
              }
            />
            <Route
              path="capital"
              element={
                <Protected route="capital">
                  <CapitalPage />
                </Protected>
              }
            />
            <Route
              path="alerts"
              element={
                <Protected route="alerts">
                  <AlertsPage />
                </Protected>
              }
            />
            <Route
              path="ai"
              element={
                <Protected route="ai">
                  <AiPage />
                </Protected>
              }
            />
            <Route
              path="governance"
              element={
                <Protected route="governance">
                  <GovernancePage />
                </Protected>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </FinanceProvider>
  )
}

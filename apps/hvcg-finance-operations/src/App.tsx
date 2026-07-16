import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './layout/AppShell'
import {
  ArPage,
  CashPage,
  KpisPage,
  OverviewPage,
  PricingPage,
  Protected,
  RetainersPage,
  RevenuePage,
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
              path="revenue"
              element={
                <Protected routeKey="revenue">
                  <RevenuePage />
                </Protected>
              }
            />
            <Route
              path="ar"
              element={
                <Protected routeKey="ar">
                  <ArPage />
                </Protected>
              }
            />
            <Route
              path="retainers"
              element={
                <Protected routeKey="retainers">
                  <RetainersPage />
                </Protected>
              }
            />
            <Route
              path="pricing"
              element={
                <Protected routeKey="pricing">
                  <PricingPage />
                </Protected>
              }
            />
            <Route
              path="cash"
              element={
                <Protected routeKey="cash">
                  <CashPage />
                </Protected>
              }
            />
            <Route
              path="kpis"
              element={
                <Protected routeKey="kpis">
                  <KpisPage />
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

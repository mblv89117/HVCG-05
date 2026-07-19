import { Routes, Route } from 'react-router-dom';
import { MicrosoftAuthProvider } from './microsoft/auth/AuthProvider';
import { AppShell } from './layout/AppShell';
import { ExecutiveDashboardPage } from './pages/ExecutiveDashboard';
import { PlaceholderModule } from './pages/PlaceholderModule';
import { AdminPage } from './pages/AdminPage';

export function App() {
  return (
    <MicrosoftAuthProvider>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<ExecutiveDashboardPage />} />
          <Route path="ai" element={<PlaceholderModule title="AI Command Center" />} />
          <Route path="clients" element={<PlaceholderModule title="Client Workspace" />} />
          <Route path="capital" element={<PlaceholderModule title="Capital Advisory" />} />
          <Route path="projects" element={<PlaceholderModule title="Project Workspace" />} />
          <Route path="documents" element={<PlaceholderModule title="Documents" />} />
          <Route path="admin" element={<AdminPage />} />
        </Route>
      </Routes>
    </MicrosoftAuthProvider>
  );
}

import { Outlet } from 'react-router-dom';
import { AdminFeedbackProvider, PermissionGuard } from '../components';

export function AdminLayout() {
  return (
    <PermissionGuard>
      <AdminFeedbackProvider>
        <Outlet />
      </AdminFeedbackProvider>
    </PermissionGuard>
  );
}

import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MainLayout } from '@/components/layout/main-layout';
import { ToastViewport } from '@/components/ui/toast-viewport';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/hooks/useAuth';
import { useSelectedConnection } from '@/hooks/useSelectedConnection';
import { useConnectionStatus, statusLabel } from '@/hooks/useConnectionStatus';
import { getToken } from '@/services/api-client';
import { LoginPage } from '@/features/auth/login-page';
import { DashboardPage } from '@/features/dashboard/dashboard-page';
import { ServerInfoPage } from '@/features/dashboard/server-info-page';
import { KeysPage } from '@/features/keys/keys-page';
import { ConsolePage } from '@/features/commands/console-page';
import { MonitoringPage } from '@/features/monitoring/monitoring-page';
import { SettingsPage } from '@/features/settings/settings-page';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false },
  },
});

function ProtectedRoute() {
  const location = useLocation();
  if (!getToken()) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return <Outlet />;
}

function AppShell() {
  const { theme, toggle } = useTheme();
  const { login, logout, isLoadingLogin, loginError, me, isAuthenticated } = useAuth();
  const { selectedId, selected, select, connections } = useSelectedConnection();
  const statusQuery = useConnectionStatus(selectedId);
  const status = statusQuery.data;
  const isConnected = status?.status === 'connected';
  const latencyMs = status?.latencyMs ?? null;

  // Login sem layout
  if (!isAuthenticated && !getToken()) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage onLogin={login} isLoading={isLoadingLogin} error={loginError} />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={<Navigate to="/" replace />} />
      <Route
        element={
          <MainLayout
            theme={theme}
            onToggleTheme={toggle}
            username={me ?? undefined}
            onLogout={logout}
            connectionName={selected?.name}
            latencyMs={latencyMs}
            isConnected={isConnected}
            connections={connections}
            selectedConnectionId={selectedId}
            onSelectConnection={select}
            statusLabel={statusLabel(status)}
          >
            <Outlet />
          </MainLayout>
        }
      >
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<DashboardPage selectedConnection={selected} status={status} />} />
          <Route path="/keys" element={<KeysPage selectedConnection={selected} />} />
          <Route path="/console" element={<ConsolePage selectedConnection={selected} />} />
          <Route path="/monitoring" element={<MonitoringPage selectedConnection={selected} />} />
          <Route path="/server" element={<ServerInfoPage selectedConnection={selected} />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppShell />
      </BrowserRouter>
      <ToastViewport />
    </QueryClientProvider>
  );
}

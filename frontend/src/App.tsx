import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from './store/authStore';

import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import TriggersPage from './pages/TriggersPage';
import NewTriggerPage from './pages/NewTriggerPage';
import PatternsPage from './pages/PatternsPage';
import WeeklySummaryPage from './pages/WeeklySummaryPage';
import SettingsPage from './pages/SettingsPage';
import Layout from './components/Layout';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1 },
  },
});

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.token);
  return token ? <>{children}</> : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route
            path="/"
            element={
              <PrivateRoute>
                <Layout />
              </PrivateRoute>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="triggers" element={<TriggersPage />} />
            <Route path="triggers/new" element={<NewTriggerPage />} />
            <Route path="patterns" element={<PatternsPage />} />
            <Route path="summary" element={<WeeklySummaryPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#191c24',
            color: '#e2e4ec',
            border: '1px solid #1e2230',
            fontFamily: 'DM Sans, sans-serif',
          },
        }}
      />
    </QueryClientProvider>
  );
}

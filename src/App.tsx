import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import CssBaseline from '@mui/material/CssBaseline';
import AppTheme from './theme/AppTheme';
import { dataGridCustomizations } from './theme/customizations/dataGrid';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Registrations from './pages/Registrations';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { authenticated } = useAuth();
  if (!authenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <AppTheme themeComponents={{ ...dataGridCustomizations }}>
      <CssBaseline enableColorScheme />
      <AuthProvider>
        <BrowserRouter basename={import.meta.env.BASE_URL}>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Registrations />
                </ProtectedRoute>
              }
            />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </AppTheme>
  );
}

import { createContext, useContext, useState, type ReactNode } from 'react';
import { clearTokens, isAuthenticated as checkAuth, login as loginApi } from '../api/client';

interface AuthContextValue {
  authenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authenticated, setAuthenticated] = useState(checkAuth());

  async function login(email: string, password: string) {
    await loginApi(email, password);
    setAuthenticated(true);
  }

  function logout() {
    clearTokens();
    setAuthenticated(false);
  }

  return (
    <AuthContext.Provider value={{ authenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

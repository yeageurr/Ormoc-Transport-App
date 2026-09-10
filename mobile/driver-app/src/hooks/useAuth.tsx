import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { getStoredToken, logoutDriver as logoutDriverRequest } from '@/api/authAPI';

interface AuthContextValue {
  isAuthenticated: boolean;
  isLoading: boolean;
  signIn: () => void;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/**
 * Wraps the app once, in the root layout. Tracks whether a token exists
 * on launch, and exposes signIn()/signOut() so Stack.Protected in the
 * root layout re-renders and auto-navigates when auth state changes.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    getStoredToken().then((token) => {
      if (mounted) {
        setIsAuthenticated(!!token);
        setIsLoading(false);
      }
    });

    return () => {
      mounted = false;
    };
  }, []);

  const signIn = () => setIsAuthenticated(true);

  const signOut = async () => {
    await logoutDriverRequest();
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { getCurrentUser, getStoredToken, logoutDriver as logoutDriverRequest } from '@/api/authAPI';

interface AuthContextValue {
  isAuthenticated: boolean;
  isLoading: boolean;
  firstName: string | null;
  signIn: (firstName?: string | null) => void;
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
  const [firstName, setFirstName] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const restoreSession = async () => {
      const token = await getStoredToken();
      if (!token) {
        if (mounted) setIsLoading(false);
        return;
      }

      if (mounted) setIsAuthenticated(true);
      try {
        const user = await getCurrentUser();
        if (mounted) setFirstName(user.first_name);
      } catch {
        // Keep the existing token session; unavailable profile data falls back to "Driver".
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    void restoreSession();

    return () => {
      mounted = false;
    };
  }, []);

  const signIn = (name?: string | null) => {
    setFirstName(name ?? null);
    setIsAuthenticated(true);
  };

  const signOut = async () => {
    await logoutDriverRequest();
    setFirstName(null);
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading, firstName, signIn, signOut }}>
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

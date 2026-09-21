import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';

import {
  getCurrentUser,
  getStoredToken,
  isSessionRevoked,
  logoutDriver as logoutDriverRequest,
} from '@/api/authAPI';

const SESSION_CHECK_INTERVAL_MS = 15_000;

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

  const signOut = useCallback(async () => {
    await logoutDriverRequest();
    setFirstName(null);
    setIsAuthenticated(false);
  }, []);

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
      } catch (error) {
        if (isSessionRevoked(error)) {
          await signOut();
        }
        // Keep a session during temporary connectivity failures so it can retry.
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    void restoreSession();

    return () => {
      mounted = false;
    };
  }, [signOut]);

  const signIn = (name?: string | null) => {
    setFirstName(name ?? null);
    setIsAuthenticated(true);
  };

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    const checkAccountStatus = async () => {
      try {
        const user = await getCurrentUser();
        setFirstName(user.first_name);
      } catch (error) {
        if (isSessionRevoked(error)) {
          await signOut();
        }
      }
    };

    void checkAccountStatus();
    const interval = setInterval(() => {
      void checkAccountStatus();
    }, SESSION_CHECK_INTERVAL_MS);
    const appStateSubscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        void checkAccountStatus();
      }
    });

    return () => {
      clearInterval(interval);
      appStateSubscription.remove();
    };
  }, [isAuthenticated, signOut]);

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

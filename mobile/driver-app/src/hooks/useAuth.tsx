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
  fullName: string | null;
  mustChangePassword: boolean;
  signIn: (fullName?: string | null, mustChangePassword?: boolean) => void;
  completePasswordChange: () => void;
  refreshUser: () => Promise<boolean>;
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
  const [fullName, setFullName] = useState<string | null>(null);
  const [mustChangePassword, setMustChangePassword] = useState(false);

  const signOut = useCallback(async () => {
    await logoutDriverRequest();
    setFullName(null);
    setMustChangePassword(false);
    setIsAuthenticated(false);
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const user = await getCurrentUser();
      const name = [user.first_name, user.last_name].filter(Boolean).join(' ').trim();
      console.info('[AUTH_DIAGNOSTIC] Refreshed password-change flag', user.must_change_password);
      setFullName(name || null);
      const requiresPasswordChange = Boolean(user.must_change_password);
      setMustChangePassword(requiresPasswordChange);
      return requiresPasswordChange;
    } catch (error) {
      if (isSessionRevoked(error)) {
        await signOut();
      }
      throw error;
    }
  }, [signOut]);

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
        if (mounted) {
          const name = [user.first_name, user.last_name].filter(Boolean).join(' ').trim();
          console.info('[AUTH_DIAGNOSTIC] Restored-session password-change flag', user.must_change_password);
          setFullName(name || null);
          setMustChangePassword(Boolean(user.must_change_password));
        }
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

  const signIn = (name?: string | null, requirePasswordChange = false) => {
    setFullName(name ?? null);
    setMustChangePassword(requirePasswordChange);
    setIsAuthenticated(true);
  };

  const completePasswordChange = () => setMustChangePassword(false);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    const checkAccountStatus = async () => {
      try {
        await refreshUser();
      } catch {
        // Keep the session through temporary connectivity failures.
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
  }, [isAuthenticated, refreshUser]);

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading, fullName, mustChangePassword, signIn, completePasswordChange, refreshUser, signOut }}>
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

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as authApi from '../api/auth.api';
import { saveAccessToken } from '../api/http';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [account, setAccount] = useState(null);
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const refreshAccount = useCallback(async () => {
    const current = await authApi.getCurrentAccount();
    setAccount(current);
    setMustChangePassword(Boolean(current.must_change_password));
    return current;
  }, []);

  useEffect(() => {
    let mounted = true;
    authApi.getCurrentAccount()
      .then((current) => {
        if (!mounted) return;
        setAccount(current);
        setMustChangePassword(Boolean(current.must_change_password));
      })
      .catch(() => {
        if (mounted) {
          saveAccessToken(null);
          setAccount(null);
        }
      })
      .finally(() => { if (mounted) setIsLoading(false); });

    const handleUnauthorized = () => {
      saveAccessToken(null);
      setAccount(null);
    };
    window.addEventListener('ota:unauthorized', handleUnauthorized);
    return () => {
      mounted = false;
      window.removeEventListener('ota:unauthorized', handleUnauthorized);
    };
  }, []);

  const signIn = useCallback(async (username, password) => {
    const result = await authApi.login(username, password);
    setAccount(result.user);
    setMustChangePassword(Boolean(result.must_change_password));
    return result;
  }, []);

  const signOut = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      setAccount(null);
      setMustChangePassword(false);
    }
  }, []);

  const value = useMemo(() => ({
    account,
    isLoading,
    mustChangePassword,
    setMustChangePassword,
    signIn,
    signOut,
    refreshAccount,
  }), [account, isLoading, mustChangePassword, signIn, signOut, refreshAccount]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used within AuthProvider');
  return value;
}

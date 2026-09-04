import { createContext, useContext, useState, useEffect } from "react";
import { login as loginApi, logout as logoutApi, getCurrentUser } from "../api/authAPI";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [account, setAccount] = useState(null);
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  
  useEffect(() => {
    const verifySession = async () => {
      try {
        const userData = await getCurrentUser();
        setAccount(userData);
      } catch (err) {
        setAccount(null);
      } finally {
        setIsLoading(false);
      }
    };

    verifySession();
  }, []);

  const login = async (username, password) => {
    const data = await loginApi(username, password);

    setAccount(data.user);
    setMustChangePassword(data.must_change_password);
    return data;
  };

  const logout = async () => {
    try {
      await logoutApi();
    } finally {
      setAccount(null);
      setMustChangePassword(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{ account, isLoading, mustChangePassword, setMustChangePassword, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
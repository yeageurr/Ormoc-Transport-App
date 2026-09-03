import { createContext, useContext, useState, useEffect } from "react";
import { login as loginApi } from "../api/authAPI";

const AuthContext = createContext(null);

function decodeToken(token) {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload; // { account_id, role, exp }
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [account, setAccount] = useState(null);
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (token) {
      const decoded = decodeToken(token);
      // Reject an expired token immediately rather than trusting stale state
      if (decoded && decoded.exp * 1000 > Date.now()) {
        setAccount(decoded);
      } else {
        localStorage.removeItem("access_token");
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (username, password) => {
    const data = await loginApi(username, password);
    localStorage.setItem("access_token", data.access_token);
    const decoded = decodeToken(data.access_token);
    setAccount(decoded);
    setMustChangePassword(data.must_change_password);
    return data;
  };

  const logout = () => {
    localStorage.removeItem("access_token");
    setAccount(null);
    setMustChangePassword(false);
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

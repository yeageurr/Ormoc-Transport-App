import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export default function PublicOnlyRoute({ children }) {
  const { account, isLoading } = useAuth();

  if (isLoading) {
    return null;
  }

  if (account) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

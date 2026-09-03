import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export default function ProtectedRoute({ children, requiredRole }) {
  const { account, isLoading, mustChangePassword } = useAuth();

  if (isLoading) {
    return null; // avoid a flash-redirect while we're still checking localStorage
  }

  if (!account) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && account.role !== requiredRole) {
    return <Navigate to="/login" replace />;
  }

  if (mustChangePassword) {
    return <Navigate to="/change-password" replace />;
  }

  return children;
}

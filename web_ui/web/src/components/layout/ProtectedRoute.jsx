import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export default function ProtectedRoute({ children, requiredRole }) {
  const { account, isLoading } = useAuth();

  if (isLoading) {
    return null; // avoid a flash-redirect while we're still checking localStorage
  }

  if (!account) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && account.role !== requiredRole) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

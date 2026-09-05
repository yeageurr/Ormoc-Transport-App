import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/layout/ProtectedRoute";
import AdminLayout from "./components/layout/AdminLayout";

import Login from "./pages/auth/Login";
import Dashboard from "./pages/admin/Dashboard";

// Placeholders for the upcoming mockup screens
const LiveMap = () => <div className="text-white">Live Map placeholder</div>;
const Users = () => <div className="text-white">Users placeholder</div>;

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />

          {/* Admin Layout Wrapper */}
          <Route
            path="/"
            element={
              <ProtectedRoute requiredRole="admin">
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            {/* Hitting / or redirecting to /dashboard loads your Dashboard component */}
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            
            <Route path="live-map" element={<LiveMap />} />
            <Route path="users" element={<Users />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
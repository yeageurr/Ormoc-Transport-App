import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/layout/ProtectedRoute";
import AdminLayout from "./components/layout/AdminLayout";

import Login from "./pages/auth/Login";
import Dashboard from "./pages/admin/Dashboard";
import Users from "./pages/admin/Users"
import Vehicles from './pages/admin/Vehicles';
import IncidentLogs from "./pages/admin/IncidentLogs";
import TripLogs from "./pages/admin/TripLogs";
import DispatchLogs from "./pages/admin/DispatchLog";
import AuditLogs from "./pages/admin/AuditLogs";
import LiveMap from "./pages/admin/LiveMap";


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
            <Route path="vehicles" element={<Vehicles />} />
            <Route path="incidents" element={<IncidentLogs />} />
            <Route path="trips" element={<TripLogs />} />
            <Route path="dispatch" element={<DispatchLogs />} />
            <Route path="audit-logs" element={<AuditLogs />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
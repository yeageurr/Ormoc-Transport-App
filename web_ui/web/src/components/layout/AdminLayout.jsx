import { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import ChangePasswordModal from "../modals/ChangePasswordModal";
import LogoutModal from "../modals/LogoutModal";
import { useAuth } from "../../context/AuthContext";

export default function AdminLayout() {
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const { mustChangePassword, setMustChangePassword, logout } = useAuth();

  return (
    <div className="flex min-h-screen bg-[var(--main-bg)]">
      <Sidebar onOpenLogout={() => setIsLogoutModalOpen(true)} />
      <main className="flex-1 p-8">
        <Outlet />
      </main>

      <ChangePasswordModal
        isOpen={mustChangePassword}
        isRequired
        onClose={() => {}}
        onSuccess={() => setMustChangePassword(false)}
      />

      <LogoutModal
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
        onConfirm={logout}
      />
    </div>
  );
}

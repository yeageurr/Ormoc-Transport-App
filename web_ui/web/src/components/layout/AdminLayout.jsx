import { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import ChangePasswordModal from "../modals/ChangePasswordModal";
import LogoutModal from "../modals/LogoutModal";
import { useAuth } from "../../context/AuthContext";
import AddUserModal from "../modals/AddUserModal";

export default function AdminLayout() {
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const { account, logout } = useAuth();

  return (
    <div className="flex bg-[var(--main-bg)] min-h-screen">
      {/* Pass the toggle function to the sidebar */}
      <Sidebar 
        onOpenChangePassword={() => setIsPasswordModalOpen(true)}
        onOpenLogout={() => setIsLogoutModalOpen(true)}
      />
      
      <main className="flex-1 p-8">
        <Outlet />
      </main>

      {/* The Modal */}
      <ChangePasswordModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
        onSuccess={() => {
          setIsPasswordModalOpen(false);
          // Optional: trigger a success notification or toast here
        }}
      />

      <LogoutModal
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
        onConfirm={logout} // Calls your AuthContext logout function
      />
    </div>
  );
}
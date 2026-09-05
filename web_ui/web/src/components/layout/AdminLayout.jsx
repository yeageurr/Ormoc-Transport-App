import { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import Sidebar from "./Sidebar";
import ChangePasswordModal from "../modals/ChangePasswordModal";

export default function AdminLayout() {
  const { mustChangePassword, setMustChangePassword } = useAuth();
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  useEffect(() => {
    setShowPasswordModal(mustChangePassword);
  }, [mustChangePassword]);

  const handlePasswordChanged = () => {
    setMustChangePassword(false);
    setShowPasswordModal(false);
  };

  const handleLater = () => {
    setShowPasswordModal(false);
  };

  return (
    <div className="flex bg-[#05130f] min-h-screen">
      <Sidebar onChangePassword={() => setShowPasswordModal(true)} />

      <main className="flex-1 p-8">
        {/* This is where the specific page content (Dashboard, LiveMap, etc.) will render */}
        <Outlet />
      </main>

      {showPasswordModal && (
        <ChangePasswordModal onClose={handleLater} onSuccess={handlePasswordChanged} />
      )}
    </div>
  );
}
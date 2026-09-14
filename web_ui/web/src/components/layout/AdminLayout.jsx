import { useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import Sidebar from "./Sidebar";
import ChangePasswordModal from "../modals/ChangePasswordModal";
import LogoutModal from "../modals/LogoutModal";
import { useAuth } from "../../context/AuthContext";
import { LogIn } from "lucide-react";

function SignInAgainModal({ isOpen, onConfirm }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl bg-[#0a2420] p-6 text-center">
        <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-[#0F6E56] text-[#9FE1CB]">
          <LogIn className="h-5 w-5" />
        </div>
        <h3 className="text-lg font-semibold text-[#eafff5]">Password changed</h3>
        <p className="mt-2 text-sm text-[#9fcabd]">
          Sign in again with your new password to start a fresh secure session.
        </p>
        <button
          type="button"
          onClick={onConfirm}
          className="mt-5 w-full rounded-xl bg-[#1D9E75] py-2.5 text-sm font-semibold text-[#04342C]"
        >
          Sign in again
        </button>
      </div>
    </div>
  );
}

export default function AdminLayout() {
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isSignInAgainModalOpen, setIsSignInAgainModalOpen] = useState(false);
  const { mustChangePassword, setMustChangePassword, logout } = useAuth();
  const navigate = useNavigate();

  const handlePasswordChanged = () => {
    setMustChangePassword(false);
    setIsPasswordModalOpen(false);
    setIsSignInAgainModalOpen(true);
  };

  const handleSignInAgain = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

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
        onSuccess={handlePasswordChanged}
      />

      <ChangePasswordModal
        isOpen={mustChangePassword}
        isRequired
        onClose={() => {}}
        onSuccess={handlePasswordChanged}
      />

      <SignInAgainModal
        isOpen={isSignInAgainModalOpen}
        onConfirm={handleSignInAgain}
      />

      <LogoutModal
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
        onConfirm={logout} // Calls your AuthContext logout function
      />
    </div>
  );
}

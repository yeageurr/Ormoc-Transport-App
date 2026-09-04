import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import ChangePasswordModal from "../../components/modals/ChangePasswordModal";

export default function Dashboard() {
  const { mustChangePassword, setMustChangePassword } = useAuth();
  const [showPasswordModal, setShowPasswordModal] = useState(mustChangePassword);

  const handlePasswordChanged = () => {
    setMustChangePassword(false);
    setShowPasswordModal(false);
  };

  const handleLater = () => {
    // "Later" dismisses for this session only — mustChangePassword stays true
    // in context, so the modal can be re-shown (e.g. from a settings prompt)
    // without needing another login.
    setShowPasswordModal(false);
  };

  return (
    <div className="min-h-screen bg-[#05130f] p-8">
      <h1 className="text-[#eafff5] text-2xl font-bold">Dashboard</h1>
      <p className="text-[#9fcabd] text-sm mt-2">Full dashboard content coming next.</p>

      {showPasswordModal && (
        <ChangePasswordModal onClose={handleLater} onSuccess={handlePasswordChanged} />
      )}
    </div>
  );
}

import { useState } from "react";
import { changePassword } from "../../api/authApi";

export default function ChangePasswordModal({ onClose, onSuccess }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (newPassword !== confirmPassword) {
      setError("New password and confirmation do not match.");
      return;
    }

    setIsSubmitting(true);
    try {
      await changePassword(currentPassword, newPassword, confirmPassword);
      onSuccess();
    } catch (err) {
      setError(err.message || "Failed to update password. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center px-4 z-50">
      <div className="bg-[#0a2420] rounded-2xl p-6 w-full max-w-sm">
        <h3 className="text-[#eafff5] text-lg font-semibold mb-1">Change your password</h3>
        <p className="text-[#9fcabd] text-sm mb-5">
          For your security, please set a new password before continuing.
        </p>

        {error && (
          <div className="bg-[#3A1B14] text-[#D98B72] text-sm rounded-xl px-4 py-3 mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-[#9fcabd] text-xs mb-1.5">Current password</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-[#eafff5] text-sm outline-none focus:border-[#1D9E75] transition-colors"
            />
          </div>

          <div>
            <label className="block text-[#9fcabd] text-xs mb-1.5">New password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-[#eafff5] text-sm outline-none focus:border-[#1D9E75] transition-colors"
            />
          </div>

          <div>
            <label className="block text-[#9fcabd] text-xs mb-1.5">Confirm new password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-[#eafff5] text-sm outline-none focus:border-[#1D9E75] transition-colors"
            />
          </div>

          {passwordsMatch && (
            <p className="text-[#5DCAA5] text-xs flex items-center gap-1.5">
              <span>✓</span> Passwords match
            </p>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-transparent border border-white/15 text-[#9fcabd] font-medium rounded-xl py-2.5 text-sm transition-colors hover:bg-white/5"
            >
              Later
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 bg-[#1D9E75] text-[#04342C] font-semibold rounded-xl py-2.5 text-sm disabled:opacity-60 transition-opacity"
            >
              {isSubmitting ? "Saving..." : "Change Password"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

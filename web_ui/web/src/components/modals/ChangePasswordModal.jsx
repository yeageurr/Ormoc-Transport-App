import { useState } from "react";
import { changePassword } from '../../api/authAPI';
import { CheckCheck, CircleX, Eye, EyeClosed } from "lucide-react";

const PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
const PASSWORD_REQUIREMENT = "Use at least 8 characters, including uppercase and lowercase letters and a number.";

export default function ChangePasswordModal({ isOpen, onClose, onSuccess, isRequired = false }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isText, setType] = useState(false);

  if (!isOpen) return null;

  // Automatically evaluates on every keystroke as state updates
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;
  const passwordsMismatch = confirmPassword.length > 0 && newPassword !== confirmPassword;


  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!PASSWORD_PATTERN.test(newPassword)) {
      setError(PASSWORD_REQUIREMENT);
      return;
    }

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0c1f2a]/45 px-4">
      <div className="w-full max-w-sm rounded-xl border border-[#d4e4eb] bg-white p-6 shadow-[0_18px_55px_rgba(10,44,63,0.2)]">
        <h3 className="mb-1 text-lg font-semibold text-[#173b4e]">Change your password</h3>
        <p className="mb-5 text-sm text-[#647c87]">
          For your security, please set a new password before continuing. {PASSWORD_REQUIREMENT}
        </p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="mb-1.5 block text-xs text-[#405f6d]">Current password</label>
            <input
              type={
                isText ? "text" : "password"
              }
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              className="w-full rounded-md border border-[#becbd1] bg-white px-3 py-2 text-sm text-[#203f4f] outline-none transition-colors focus:border-[#168dff]"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs text-[#405f6d]">New password</label>
            <input
              type={
                isText ? "text" : "password"
              }
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              minLength={8}
              pattern={PASSWORD_PATTERN.source}
              title={PASSWORD_REQUIREMENT}
              required
              className="w-full rounded-md border border-[#becbd1] bg-white px-3 py-2 text-sm text-[#203f4f] outline-none transition-colors focus:border-[#168dff]"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs text-[#405f6d]">Confirm new password</label>
            <div className="relative">
              <input
                type={
                  isText ? "text" : "password"
                }
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="w-full rounded-md border border-[#becbd1] bg-white px-3 py-2 pr-10 text-sm text-[#203f4f] outline-none transition-colors focus:border-[#168dff]"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer">
                {isText ? 
                  <Eye
                    size={"18px"} 
                    color={"#52636b"}
                    onClick={() => setType(!isText)}
                  />
                  :
                  <EyeClosed
                    size={"18px"} 
                    color={"#52636b"}
                    onClick={() => setType(!isText)}
                  />
                }
              </div>
            </div>
          </div>

          {/* Real-time feedback indicators */}
          {passwordsMatch && (
            <div className="flex items-center gap-1.5 pt-1 text-xs text-[#008b43]">
              <CheckCheck className="w-4 h-4" />
              <span>Passwords match</span>
            </div>
          )}

          {passwordsMismatch && (
            <div className="flex items-center gap-1.5 pt-1 text-xs text-rose-700">
              <CircleX className="w-4 h-4" />
              <span>Passwords do not match</span>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-1.5 pt-1 text-xs text-rose-700" role="alert">
              <CircleX className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex gap-3 pt-3">
            {!isRequired && (
              <button
                type="button"
                onClick={onClose}
                className="h-[35px] flex-1 rounded-md border-0 bg-[#edf4f7] text-sm font-medium text-[#34515f] transition-colors hover:bg-[#dcecf2]"
              >
                Later
              </button>
            )}
            <button
              type="submit"
              disabled={isSubmitting || !passwordsMatch}
              className="h-[35px] flex-1 rounded-md border-0 bg-[#168dff] text-sm font-semibold text-white transition-colors hover:bg-[#0876db] disabled:opacity-40"
            >
              {isSubmitting ? "Saving..." : "Change Password"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

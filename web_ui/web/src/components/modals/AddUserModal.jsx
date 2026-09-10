import { useState } from "react";
import { X, UserPlus } from "lucide-react";
import { createDriver } from "../../api/usersAPI";

export default function AddUserModal({ isOpen, onClose, onSuccess }) {
  const initialFormState = {
    first_name: "",
    last_name: "",
    email: "",
    contact_number: "",
    license_num: "",
    license_expiry: "",
  };

  const [formData, setFormData] = useState(initialFormState);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // Simple validation
    if (
      !formData.first_name.trim() ||
      !formData.last_name.trim() ||
      !formData.contact_number.trim() ||
      !formData.license_num.trim() ||
      !formData.license_expiry
    ) {
      setError("First name, last name, contact #, license #, and license expiry are required.");
      return;
    }

    setIsSubmitting(true);
    try {
      await createDriver({
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim(),
        contact_number: formData.contact_number.trim(),
        email: formData.email.trim() || undefined,
        license_num: formData.license_num.trim(),
        license_expiry: formData.license_expiry,
      });

      setFormData(initialFormState);
      onSuccess();
    } catch (err) {
      setError(
        err?.response?.data?.detail || err.message || "Failed to create user. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center px-4 z-50">
      <div className="bg-[#0a2420] border border-white/10 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-[#1D9E75]" />
            <h3 className="text-[#eafff5] text-base font-semibold">Add New User</h3>
          </div>
          <button
            onClick={onClose}
            className="text-[#9fcabd] hover:text-[#eafff5] p-1.5 rounded-lg hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-[#3A1B14] border border-[#D98B72]/30 text-[#D98B72] text-xs px-3.5 py-2.5 rounded-xl">
              {error}
            </div>
          )}

          {/* Full Name */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[#9fcabd] text-xs font-medium mb-1.5">First Name</label>
              <input
                type="text"
                name="first_name"
                placeholder="e.g. Juan"
                value={formData.first_name}
                onChange={handleChange}
                className="w-full bg-[#05130f] border border-white/10 rounded-xl px-4 py-2.5 text-[#eafff5] text-sm outline-none focus:border-[#1D9E75] placeholder:text-[#9fcabd]/50 transition-colors"
              />
            </div>
            <div>
              <label className="block text-[#9fcabd] text-xs font-medium mb-1.5">Last Name</label>
              <input
                type="text"
                name="last_name"
                placeholder="e.g. Dela Cruz"
                value={formData.last_name}
                onChange={handleChange}
                className="w-full bg-[#05130f] border border-white/10 rounded-xl px-4 py-2.5 text-[#eafff5] text-sm outline-none focus:border-[#1D9E75] placeholder:text-[#9fcabd]/50 transition-colors"
              />
            </div>
          </div>

          {/* Role (fixed to Driver) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[#9fcabd] text-xs font-medium mb-1.5">User Role</label>
              <select
                disabled
                name="role"
                value="Driver"
                className="w-full bg-[#05130f] border border-white/10 rounded-xl px-4 py-2.5 text-[#eafff5] text-sm outline-none focus:border-[#1D9E75] transition-colors cursor-pointer"
              >
                <option value="Driver">Driver</option>
              </select>
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-[#9fcabd] text-xs font-medium mb-1.5">Email Address (Optional)</label>
            <input
              autoComplete="off"
              type="email"
              name="email"
              placeholder="e.g. juan@artfusion.com"
              value={formData.email}
              onChange={handleChange}
              className="w-full bg-[#05130f] border border-white/10 rounded-xl px-4 py-2.5 text-[#eafff5] text-sm outline-none focus:border-[#1D9E75] placeholder:text-[#9fcabd]/50 transition-colors"
            />
          </div>

          {/* Contact Number */}
          <div>
            <label className="block text-[#9fcabd] text-xs font-medium mb-1.5">Contact Number</label>
            <input
              autoComplete="off"
              type="text"
              name="contact_number"
              placeholder="e.g. 09123456789"
              value={formData.contact_number}
              onChange={handleChange}
              className="w-full bg-[#05130f] border border-white/10 rounded-xl px-4 py-2.5 text-[#eafff5] text-sm outline-none focus:border-[#1D9E75] placeholder:text-[#9fcabd]/50 transition-colors"
            />
          </div>

          {/* License Number & Expiry */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[#9fcabd] text-xs font-medium mb-1.5">License Number</label>
              <input
                autoComplete="off"
                type="text"
                name="license_num"
                placeholder="e.g. N01-23-456789"
                value={formData.license_num}
                onChange={handleChange}
                className="w-full bg-[#05130f] border border-white/10 rounded-xl px-4 py-2.5 text-[#eafff5] text-sm outline-none focus:border-[#1D9E75] placeholder:text-[#9fcabd]/50 transition-colors"
              />
            </div>
            <div>
              <label className="block text-[#9fcabd] text-xs font-medium mb-1.5">License Expiry</label>
              <input
                type="date"
                autoComplete="off"
                min={'2026-09-10'}
                name="license_expiry"
                value={formData.license_expiry}
                onChange={handleChange}
                className="w-full bg-[#05130f] border border-white/10 rounded-xl px-4 py-2.5 text-[#eafff5] text-sm outline-none focus:border-[#1D9E75] transition-colors [color-scheme:dark]"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="bg-transparent border border-white/15 text-[#9fcabd] font-medium px-4 py-2.5 rounded-xl text-sm hover:bg-white/5 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-[#1D9E75] hover:opacity-90 text-[#04342C] font-semibold px-5 py-2.5 rounded-xl text-sm transition-opacity disabled:opacity-50"
            >
              {isSubmitting ? "Saving..." : "Save User"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

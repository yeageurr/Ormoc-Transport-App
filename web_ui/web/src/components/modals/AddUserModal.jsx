import { useState } from "react";
import { X, UserPlus } from "lucide-react";

export default function AddUserModal({ isOpen, onClose, onAddUser }) {
  const [formData, setFormData] = useState({
    name: "",
    role: "Driver",
    email: "",
    contact: "",
    status: "Active",
  });

  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");

    // Simple validation
    if (!formData.name.trim() || !formData.contact.trim()) {
      setError("Name and Contact # are required fields.");
      return;
    }

    // Pass new user data up to the parent component
    onAddUser({
      ...formData,
      id: Date.now(), // Temporary unique ID generator
      email: formData.email.trim() || "--",
    });

    // Reset form and close modal
    setFormData({ first_name: "", last_name: "", role: "Driver", email: "", contact: "", status: "Active" });
    onClose();
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
                name="name"
                placeholder="e.g. Juan Dela Cruz"
                value={formData.first_name}
                onChange={handleChange}
                className="w-full bg-[#05130f] border border-white/10 rounded-xl px-4 py-2.5 text-[#eafff5] text-sm outline-none focus:border-[#1D9E75] placeholder:text-[#9fcabd]/50 transition-colors"
              />
            </div>
            <div>
              <label className="block text-[#9fcabd] text-xs font-medium mb-1.5">Last Name</label>
              <input
                type="text"
                name="name"
                placeholder="e.g. Juan Dela Cruz"
                value={formData.last_name}
                onChange={handleChange}
                className="w-full bg-[#05130f] border border-white/10 rounded-xl px-4 py-2.5 text-[#eafff5] text-sm outline-none focus:border-[#1D9E75] placeholder:text-[#9fcabd]/50 transition-colors"
              />
            </div>
          </div>

          {/* Role & Status Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[#9fcabd] text-xs font-medium mb-1.5">User Role</label>
              <select
                disabled
                name="role"
                value={formData.role}
                onChange={handleChange}
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
              type="text"
              name="contact"
              placeholder="e.g. 09123456789"
              value={formData.contact}
              onChange={handleChange}
              className="w-full bg-[#05130f] border border-white/10 rounded-xl px-4 py-2.5 text-[#eafff5] text-sm outline-none focus:border-[#1D9E75] placeholder:text-[#9fcabd]/50 transition-colors"
            />
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
              className="bg-[#1D9E75] hover:opacity-90 text-[#04342C] font-semibold px-5 py-2.5 rounded-xl text-sm transition-opacity"
            >
              Save User
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
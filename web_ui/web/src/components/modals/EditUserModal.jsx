import { useState } from "react";
import { X } from "lucide-react";
import { updateDriver } from "../../api/usersAPI";

export default function EditUserModal({ driver, onClose, onSuccess, onError }) {
  const [form, setForm] = useState({ first_name: driver.first_name || "", last_name: driver.last_name || "", email: driver.email || "", contact_number: driver.contact_number || "", license_num: driver.license_num || "", license_expiry: driver.license_expiry?.slice(0, 10) || "" });
  const [isSaving, setIsSaving] = useState(false);
  const update = (event) => setForm({ ...form, [event.target.name]: event.target.value });
  const submit = async (event) => {
    event.preventDefault();
    setIsSaving(true);
    try { onSuccess(await updateDriver(driver.user_id, { ...form, email: form.email || null })); }
    catch (error) { onError(error.message || "Failed to update user."); }
    finally { setIsSaving(false); }
  };
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm"><div className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#0a2420] shadow-2xl"><div className="flex items-center justify-between border-b border-white/10 px-6 py-4"><h3 className="text-base font-semibold text-[#eafff5]">Edit User</h3><button onClick={onClose} disabled={isSaving} className="text-[#9fcabd] hover:text-white"><X /></button></div><form onSubmit={submit} className="space-y-4 p-6"><div className="grid grid-cols-2 gap-4"><Field label="First Name" name="first_name" value={form.first_name} onChange={update} /><Field label="Last Name" name="last_name" value={form.last_name} onChange={update} /></div><Field label="Email" name="email" type="email" value={form.email} onChange={update} optional /><Field label="Contact Number" name="contact_number" value={form.contact_number} onChange={update} /><div className="grid grid-cols-2 gap-4"><Field label="License Number" name="license_num" value={form.license_num} onChange={update} /><Field label="License Expiry" name="license_expiry" type="date" value={form.license_expiry} onChange={update} /></div><div className="flex justify-end gap-3 border-t border-white/10 pt-4"><button type="button" onClick={onClose} disabled={isSaving} className="rounded-xl border border-white/15 px-4 py-2.5 text-sm text-[#9fcabd]">Cancel</button><button disabled={isSaving} className="rounded-xl bg-[#1D9E75] px-5 py-2.5 text-sm font-semibold text-[#04342C] disabled:opacity-50">{isSaving ? "Saving..." : "Save changes"}</button></div></form></div></div>;
}

function Field({ label, name, type = "text", value, onChange, optional = false }) {
  return <label className="block text-xs text-[#9fcabd]">{label}<input required={!optional} type={type} name={name} value={value} onChange={onChange} className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#05130f] px-3 py-2.5 text-sm text-[#eafff5] outline-none focus:border-[#1D9E75]" /></label>;
}

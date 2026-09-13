import { AlertTriangle, X } from "lucide-react";

const actionCopy = {
  suspend: { title: "Suspend user?", detail: "They will not be able to sign in until their account is reactivated.", confirm: "Suspend" },
  reactivate: { title: "Reactivate user?", detail: "They will be able to sign in again immediately.", confirm: "Reactivate" },
  delete: { title: "Disable user?", detail: "This preserves their trip history but permanently blocks sign-in.", confirm: "Disable" },
};

export default function UserActionConfirmModal({ action, driver, isSubmitting, onClose, onConfirm }) {
  if (!action || !driver) return null;
  const copy = actionCopy[action];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#0a2420] p-6 shadow-2xl">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="flex gap-3"><div className="rounded-xl bg-[#3A1B14] p-2.5 text-[#D98B72]"><AlertTriangle className="h-5 w-5" /></div><div><h3 className="text-base font-semibold text-[#eafff5]">{copy.title}</h3><p className="mt-1 text-sm text-[#9fcabd]">{driver.first_name} {driver.last_name}</p></div></div>
          <button onClick={onClose} disabled={isSubmitting} className="text-[#9fcabd] hover:text-[#eafff5]"><X className="h-5 w-5" /></button>
        </div>
        <p className="text-sm text-[#9fcabd]">{copy.detail}</p>
        <div className="mt-6 flex gap-3"><button type="button" onClick={onClose} disabled={isSubmitting} className="flex-1 rounded-xl border border-white/15 py-2.5 text-sm font-medium text-[#eafff5] hover:bg-white/5 disabled:opacity-50">Cancel</button><button type="button" onClick={onConfirm} disabled={isSubmitting} className="flex-1 rounded-xl bg-[#D98B72] py-2.5 text-sm font-semibold text-[#24110c] hover:opacity-90 disabled:opacity-50">{isSubmitting ? "Saving..." : copy.confirm}</button></div>
      </div>
    </div>
  );
}

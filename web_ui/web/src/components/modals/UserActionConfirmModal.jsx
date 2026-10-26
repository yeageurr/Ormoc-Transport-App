import { AlertTriangle, X } from "lucide-react";

const actionCopy = {
  suspend: { title: "Suspend user?", detail: "They will not be able to sign in until their account is reactivated.", confirm: "Suspend" },
  reactivate: { title: "Reactivate user?", detail: "This will restore the account to active so they can sign in again.", confirm: "Reactivate" },
  delete: { title: "Deactivate user?", detail: "This preserves their trip history and blocks sign-in. You can reactivate the account later.", confirm: "Deactivate" },
};

export default function UserActionConfirmModal({ action, driver, isSubmitting, onClose, onConfirm }) {
  if (!action || !driver) return null;
  const copy = actionCopy[action];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0c1f2a]/45 px-4">
      <div className="w-full max-w-sm rounded-xl border border-[#d4e4eb] bg-white p-6 shadow-[0_18px_55px_rgba(10,44,63,0.2)]">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="flex gap-3"><div className="rounded-lg bg-[#fff4df] p-2.5 text-[#a86a00]"><AlertTriangle className="h-5 w-5" /></div><div><h3 className="text-base font-semibold text-[#173b4e]">{copy.title}</h3><p className="mt-1 text-sm text-[#647c87]">{driver.first_name} {driver.last_name}</p></div></div>
          <button onClick={onClose} disabled={isSubmitting} aria-label="Close" className="text-[#718792] hover:text-[#173b4e]"><X className="h-5 w-5" /></button>
        </div>
        <p className="text-sm text-[#647c87]">{copy.detail}</p>
        <div className="mt-6 flex gap-3"><button type="button" onClick={onClose} disabled={isSubmitting} className="h-[35px] flex-1 rounded-md border-0 bg-[#edf4f7] text-sm font-medium text-[#34515f] hover:bg-[#dcecf2] disabled:opacity-50">Cancel</button><button type="button" onClick={onConfirm} disabled={isSubmitting} className="h-[35px] flex-1 rounded-md border-0 bg-[#c1363b] text-sm font-semibold text-white hover:bg-[#a92d32] disabled:opacity-50">{isSubmitting ? "Saving..." : copy.confirm}</button></div>
      </div>
    </div>
  );
}

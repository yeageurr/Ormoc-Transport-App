import { LogOut, X } from "lucide-react";

export default function LogoutModal({ isOpen, onClose, onConfirm }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0c1f2a]/45 px-4">
      <div className="relative w-full max-w-sm rounded-xl border border-[#d4e4eb] bg-white p-6 shadow-[0_18px_55px_rgba(10,44,63,0.2)]">
        <div className="flex flex-col justify-center items-center gap-3 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#eaf7fc] text-[#0879ac]">
            <LogOut className="w-5 h-5" />
          </div>
          <div className="w-full flex flex-col items-center justify-center">
            <h3 className="text-lg font-semibold text-[#173b4e]">Confirm Logout</h3>
            <p className="text-xs text-[#647c87]">Are you sure you want to end your session?</p>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="h-[35px] flex-1 rounded-md border-0 bg-[#edf4f7] text-sm font-medium text-[#34515f] transition-colors hover:bg-[#dcecf2]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="h-[35px] flex-1 rounded-md border-0 bg-[#168dff] text-sm font-semibold text-white transition-colors hover:bg-[#0876db]"
          >
            Log Out
          </button>
        </div>
      </div>
    </div>
  );
}

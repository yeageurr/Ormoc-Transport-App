import { LogOut, X } from "lucide-react";

export default function LogoutModal({ isOpen, onClose, onConfirm }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center px-4 z-50">
      <div className="bg-[#194842] border border-[#113830] rounded-2xl p-6 w-full max-w-sm relative">
        <div className="flex flex-col justify-center items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-[#3A1B14] flex items-center justify-center text-[#D98B72]">
            <LogOut className="w-5 h-5" />
          </div>
          <div className="w-full flex flex-col items-center justify-center">
            <h3 className="text-[#eafff5] text-lg font-semibold font-Roboto">Confirm Logout</h3>
            <p className="text-[#9fcabd] text-xs">Are you sure you want to end your session?</p>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 bg-transparent border border-white/15 text-[#fff] font-medium rounded-[5px] py-2.5 text-sm transition-colors hover:bg-white/5"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 bg-[#1D9E75] text-[#fff] font-semibold font-roboto rounded-[5px] py-2.5 text-sm transition-colors hover:opacity-90"
          >
            Log Out
          </button>
        </div>
      </div>
    </div>
  );
}
import { AlertTriangle, X } from "lucide-react";

export default function VehicleDeleteConfirmModal({ vehicle, isSubmitting, onClose, onConfirm }) {
  if (!vehicle) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#0a2420] p-6 shadow-2xl">
        <div className="mb-4 flex items-start justify-between gap-4"><div className="flex gap-3"><div className="rounded-xl bg-[#3A1B14] p-2.5 text-[#D98B72]"><AlertTriangle className="h-5 w-5" /></div><div><h3 className="text-base font-semibold text-[#eafff5]">Delete vehicle?</h3><p className="mt-1 text-sm text-[#9fcabd]">{vehicle.plate_number}</p></div></div><button title="Close" aria-label="Close" onClick={onClose} disabled={isSubmitting} className="text-[#9fcabd] hover:text-white"><X className="h-5 w-5" /></button></div>
        <p className="text-sm text-[#9fcabd]">This permanently removes the vehicle. Vehicles with dispatch history are protected and cannot be deleted.</p>
        <div className="mt-6 flex gap-3"><button type="button" onClick={onClose} disabled={isSubmitting} className="flex-1 rounded-xl border border-white/15 py-2.5 text-sm font-medium text-[#eafff5] disabled:opacity-50">Cancel</button><button type="button" onClick={onConfirm} disabled={isSubmitting} className="flex-1 rounded-xl bg-[#D98B72] py-2.5 text-sm font-semibold text-[#24110c] disabled:opacity-50">{isSubmitting ? "Deleting..." : "Delete"}</button></div>
      </div>
    </div>
  );
}

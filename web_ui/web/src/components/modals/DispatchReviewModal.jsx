import { Plus, X } from "lucide-react";

export default function DispatchReviewModal({ routeName, effectiveDate, assignments, driverMap, vehicleMap, vehicleDetails, isSaving, onClose, onAddDriver, onRemove, onConfirm }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-6 backdrop-blur-sm">
      <div className="w-full max-w-3xl overflow-hidden rounded-2xl border border-white/10 bg-[#0a2420] shadow-2xl">
        <div className="border-b border-white/10 px-6 py-5">
          <h3 className="text-lg font-semibold text-[#eafff5]">Create dispatch for: {routeName}</h3>
          <p className="mt-1 text-sm text-[#9fcabd]">Effective on: {effectiveDate}</p>
        </div>
        <div className="p-6">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-medium text-[#eafff5]">Assigned drivers: {assignments.length}</p>
            <button onClick={onAddDriver} className="inline-flex items-center gap-1 rounded-lg border border-[#1D9E75]/50 px-3 py-1.5 text-xs font-semibold text-[#5DCAA5]"><Plus size={15} /> Add driver</button>
          </div>
          <div className="overflow-x-auto rounded-xl border border-white/10">
            <table className="w-full text-left text-sm">
              <thead className="bg-white/5 text-xs text-[#9fcabd]"><tr><th className="px-4 py-3 font-medium">Name</th><th className="px-4 py-3 font-medium">Body color</th><th className="px-4 py-3 font-medium">Body number</th><th className="px-4 py-3 font-medium">Plate #</th><th className="px-4 py-3" aria-label="Remove assignment" /></tr></thead>
              <tbody>
                {assignments.length ? assignments.map((assignment, index) => {
                  const vehicle = vehicleDetails[assignment.vehicle_id];
                  return <tr key={`${assignment.driver_id}-${assignment.vehicle_id}`} className="border-t border-white/5 text-[#eafff5]"><td className="px-4 py-3">{driverMap[assignment.driver_id] || "—"}</td><td className="px-4 py-3 text-[#9fcabd]">{vehicle?.body_color || "—"}</td><td className="px-4 py-3 text-[#9fcabd]">{vehicle?.body_number || "—"}</td><td className="px-4 py-3 text-[#9fcabd]">{vehicleMap[assignment.vehicle_id] || "—"}</td><td className="px-4 py-3 text-right"><button title="Remove driver" onClick={() => onRemove(index)} className="text-[#D98B72]"><X size={16} /></button></td></tr>;
                }) : <tr><td colSpan={5} className="px-4 py-6 text-center text-[#9fcabd]">No drivers assigned yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
        <div className="flex gap-3 border-t border-white/10 px-6 py-4">
          <button onClick={onClose} disabled={isSaving} className="flex-1 rounded-xl border border-white/15 py-2.5 text-sm font-medium text-[#9fcabd]">Cancel</button>
          <button disabled={!assignments.length || isSaving} onClick={onConfirm} className="flex-1 rounded-xl bg-[#1D9E75] py-2.5 text-sm font-semibold text-[#04342C] disabled:opacity-50">{isSaving ? "Saving..." : "Confirm and save"}</button>
        </div>
      </div>
    </div>
  );
}

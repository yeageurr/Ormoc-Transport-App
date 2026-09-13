import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { getEligibleOwners, updateVehicle } from "../../api/vehiclesAPI";

const CONDITIONS = [
  { value: "new", label: "New" },
  { value: "operational", label: "Operational" },
  { value: "under_maintenance", label: "Under maintenance" },
];

export default function EditVehicleModal({ vehicle, onClose, onSuccess, onError }) {
  const [form, setForm] = useState({
    body_color: vehicle.body_color || "#1D9E75",
    plate_number: vehicle.plate_number || "",
    owner_id: String(vehicle.owner_id),
    condition: vehicle.condition || "new",
    registry_expiration: vehicle.registry_expiration?.slice(0, 10) || "",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [owners, setOwners] = useState([]);
  const [ownersError, setOwnersError] = useState(null);

  useEffect(() => {
    getEligibleOwners(vehicle.vehicle_id).then(setOwners).catch((error) => {
      setOwnersError(error.message || "Failed to load eligible drivers.");
    });
  }, [vehicle.vehicle_id]);

  const submit = async (event) => {
    event.preventDefault();
    setIsSaving(true);
    try {
      const updated = await updateVehicle(vehicle.vehicle_id, { ...form, owner_id: Number(form.owner_id) });
      await onSuccess(updated);
    } catch (error) {
      onError(error.message || "Failed to update vehicle.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#0a2420] p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between gap-4">
          <div><h3 className="text-base font-semibold text-[#eafff5]">Edit vehicle</h3><p className="mt-1 text-sm text-[#9fcabd]">{vehicle.plate_number}</p></div>
          <button title="Close" aria-label="Close" onClick={onClose} disabled={isSaving} className="text-[#9fcabd] hover:text-white"><X /></button>
        </div>
        <form onSubmit={submit} className="space-y-4">
          {ownersError && <p className="rounded-xl bg-[#3A1B14] px-3 py-2 text-sm text-[#D98B72]">{ownersError}</p>}
          <label className="block text-xs text-[#9fcabd]">Plate number
            <input required value={form.plate_number} onChange={(event) => setForm({ ...form, plate_number: event.target.value })} className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#05130f] px-3 py-2.5 text-sm text-[#eafff5] outline-none focus:border-[#1D9E75]" />
          </label>
          <label className="block text-xs text-[#9fcabd]">Owner (driver)
            <select required value={form.owner_id} onChange={(event) => setForm({ ...form, owner_id: event.target.value })} disabled={Boolean(ownersError)} className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#05130f] px-3 py-2.5 text-sm text-[#eafff5] outline-none focus:border-[#1D9E75] disabled:opacity-50">
              {owners.map((owner) => <option key={owner.user_id} value={owner.user_id}>{owner.first_name} {owner.last_name}</option>)}
            </select>
          </label>
          <label className="block text-xs text-[#9fcabd]">Body color
            <div className="mt-1.5 flex items-center gap-3"><input type="color" value={form.body_color} onChange={(event) => setForm({ ...form, body_color: event.target.value })} className="h-10 w-10 cursor-pointer rounded-lg border border-white/10 bg-transparent" /><span className="font-mono text-sm text-[#eafff5]">{form.body_color}</span></div>
          </label>
          <label className="block text-xs text-[#9fcabd]">Condition
            <select value={form.condition} onChange={(event) => setForm({ ...form, condition: event.target.value })} className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#05130f] px-3 py-2.5 text-sm text-[#eafff5] outline-none focus:border-[#1D9E75]">
              {CONDITIONS.map((condition) => <option key={condition.value} value={condition.value}>{condition.label}</option>)}
            </select>
          </label>
          <label className="block text-xs text-[#9fcabd]">Registry expiration
            <input required type="date" value={form.registry_expiration} onChange={(event) => setForm({ ...form, registry_expiration: event.target.value })} className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#05130f] px-3 py-2.5 text-sm text-[#eafff5] outline-none focus:border-[#1D9E75]" />
          </label>
          <div className="flex gap-3 border-t border-white/10 pt-4"><button type="button" onClick={onClose} disabled={isSaving} className="flex-1 rounded-xl border border-white/15 py-2.5 text-sm font-medium text-[#eafff5] disabled:opacity-50">Cancel</button><button disabled={isSaving} className="flex-1 rounded-xl bg-[#1D9E75] py-2.5 text-sm font-semibold text-[#04342C] disabled:opacity-50">{isSaving ? "Saving..." : "Save changes"}</button></div>
        </form>
      </div>
    </div>
  );
}

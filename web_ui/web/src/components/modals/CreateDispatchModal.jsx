import { useMemo, useState } from "react";

// Step 3 of dispatch creation. The route and effective date are deliberately
// inherited from the preceding steps, so an assignment cannot drift away from
// the dispatch being reviewed.
export default function CreateDispatchModal({ drivers, vehicles, assignedDriverIds = [], assignedVehicleIds = [], onClose, onStage }) {
  const [form, setForm] = useState({ driver_id: "", vehicle_id: "" });
  const [error, setError] = useState(null);
  const availableDrivers = useMemo(() => drivers.filter((driver) => driver.account?.status === "active" && !assignedDriverIds.includes(driver.user_id)), [drivers, assignedDriverIds]);
  const availableVehicles = useMemo(() => vehicles.filter((vehicle) => vehicle.condition !== "under_maintenance" && !assignedVehicleIds.includes(vehicle.vehicle_id)), [vehicles, assignedVehicleIds]);

  const handleSubmit = (event) => {
    event.preventDefault();
    setError(null);
    if (!form.driver_id || !form.vehicle_id) {
      setError("Choose a driver and vehicle.");
      return;
    }
    onStage({ driver_id: Number(form.driver_id), vehicle_id: Number(form.vehicle_id) });
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center px-4 z-50">
      <div className="bg-[#0a2420] rounded-2xl p-6 w-full max-w-sm">
        <h3 className="text-[#eafff5] text-lg font-semibold mb-4">Assign a driver</h3>

        {error && (
          <div className="bg-[#3A1B14] text-[#D98B72] text-sm rounded-xl px-4 py-3 mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-[#9fcabd] text-xs mb-1.5">Driver</label>
            <select
              required
              value={form.driver_id}
              onChange={(e) => setForm({ ...form, driver_id: e.target.value })}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-[#eafff5] text-sm outline-none"
            >
              <option
                value=""
                disabled
                className="text-black"
              >Select a driver</option>
              {availableDrivers.map((d) => (
                <option
                  key={d.user_id} value={d.user_id}
                  className="text-black"
                >
                  {d.first_name} {d.last_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[#9fcabd] text-xs mb-1.5">Vehicle</label>
            <select
              required
              value={form.vehicle_id}
              onChange={(e) => setForm({ ...form, vehicle_id: e.target.value })}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-[#eafff5] text-sm outline-none"
            >
              <option
                value=""
                disabled
                className="text-black"
              >Select a vehicle</option>
              {availableVehicles.map((v) => (
                <option
                  key={v.vehicle_id}
                  value={v.vehicle_id}
                  className="text-black"
                >{v.plate_number}</option>
              ))}
            </select>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-transparent border border-white/15 text-[#9fcabd] font-medium rounded-xl py-2.5 text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={false}
              className="flex-1 bg-[#1D9E75] text-[#04342C] font-semibold rounded-xl py-2.5 text-sm disabled:opacity-60"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

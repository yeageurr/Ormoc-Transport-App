import { useState } from "react";

export default function CreateDispatchModal({ drivers, vehicles, routes, onClose, onStage, lockedDate }) {
  const [form, setForm] = useState({
    driver_id: "",
    vehicle_id: "",
    route_id: "",
    effective_on: lockedDate || new Date().toLocaleDateString("en-CA"),
  });
  const [error, setError] = useState(null);
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    onStage({ ...form, driver_id: Number(form.driver_id), vehicle_id: Number(form.vehicle_id), route_id: Number(form.route_id), effective_on: new Date(`${form.effective_on}T00:00:00`).toISOString() });
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center px-4 z-50">
      <div className="bg-[#0a2420] rounded-2xl p-6 w-full max-w-sm">
        <h3 className="text-[#eafff5] text-lg font-semibold mb-4">Create new dispatch</h3>

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
              <option value="" disabled>Select a driver</option>
              {drivers.map((d) => (
                <option
                  key={d.user_id} value={d.user_id}
                  className="" // LEFT HERE 
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
              <option value="" disabled>Select a vehicle</option>
              {vehicles.map((v) => (
                <option key={v.vehicle_id} value={v.vehicle_id}>{v.plate_number}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[#9fcabd] text-xs mb-1.5">Route</label>
            <select
              required
              value={form.route_id}
              onChange={(e) => setForm({ ...form, route_id: e.target.value })}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-[#eafff5] text-sm outline-none"
            >
              <option value="" disabled>Select a route</option>
              {routes.map((r) => (
                <option key={r.route_id} value={r.route_id}>
                  Ormoc - {r.destination?.name || `Route #${r.route_id}`}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[#9fcabd] text-xs mb-1.5">Effective date</label>
            <input
              type="date"
              required
              value={form.effective_on}
              min={new Date().toLocaleDateString("en-CA")}
              disabled={Boolean(lockedDate)}
              onChange={(e) => setForm({ ...form, effective_on: e.target.value })}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-[#eafff5] text-sm outline-none"
            />
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
              Add to batch
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

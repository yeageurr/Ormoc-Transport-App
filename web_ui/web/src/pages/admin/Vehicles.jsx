import { useState, useEffect, useMemo } from "react";
import ChangePasswordModal from "../../components/modals/ChangePasswordModal";
import { useAuth } from "../../context/AuthContext";
import { getVehicles, getEligibleOwners, createVehicle, deleteVehicle } from "../../api/vehiclesAPI";
import PageHeader from "../../components/ui/PageHeader";
import Toast from "../../components/ui/Toast";
import EditVehicleModal from "../../components/modals/EditVehicleModal";
import VehicleDeleteConfirmModal from "../../components/modals/VehicleDeleteConfirmModal";
import { Edit3, Trash2 } from "lucide-react";


function getContrastTextColor(hex) {
  if (!hex || hex.length !== 7) return "#000000";
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 128 ? "#000000" : "#FFFFFF";
}

function ColorSwatch({ hex }) {
  return (
    <span
      className="inline-block text-xs font-mono px-2.5 py-1 rounded-full border border-white/15"
      style={{ backgroundColor: hex, color: getContrastTextColor(hex) }}
    >
      {hex}
    </span>
  );
}

function AddVehicleModal({ onClose, onSuccess, onError }) {
  const [owners, setOwners] = useState([]);
  const [form, setForm] = useState({
    owner_id: "",
    body_color: "#1D9E75",
    body_number: "",
    plate_number: "",
    vehicle_type: "Multicab",
    registry_expiration: "",
  });
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    getEligibleOwners()
      .then(setOwners)
      .catch((err) => setError(err.message || "Failed to load eligible drivers."));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const vehicle = await createVehicle({ ...form, owner_id: Number(form.owner_id) });
      onSuccess(vehicle);
    } catch (err) {
      const message = err.message || "Failed to register vehicle.";
      setError(message);
      onError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center px-4 z-50">
      <div className="bg-[#0a2420] rounded-2xl p-6 w-full max-w-sm">
        <h3 className="text-[#eafff5] text-lg font-semibold mb-4">Add new vehicle</h3>

        {error && (
          <div className="bg-[#3A1B14] text-[#D98B72] text-sm rounded-xl px-4 py-3 mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-[#9fcabd] text-xs mb-1.5">Owner (driver)</label>
            <select
              required
              value={form.owner_id}
              onChange={(e) => setForm({ ...form, owner_id: e.target.value })}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-[#eafff5] text-sm outline-none"
            >
              <option value="" disabled>
                {owners.length === 0 ? "No eligible drivers available" : "Select a driver"}
              </option>
              {owners.map((owner) => (
                <option key={owner.user_id} value={owner.user_id}>
                  {owner.first_name} {owner.last_name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[#9fcabd] text-xs mb-1.5">Plate number</label>
              <input
                required
                value={form.plate_number}
                onChange={(e) => setForm({ ...form, plate_number: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-[#eafff5] text-sm outline-none"
              />
            </div>
            <div>
              <label className="block text-[#9fcabd] text-xs mb-1.5">Body number</label>
              <input
                required
                value={form.body_number}
                onChange={(e) => setForm({ ...form, body_number: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-[#eafff5] text-sm outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-[#9fcabd] text-xs mb-1.5">Body color</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={form.body_color}
                onChange={(e) => setForm({ ...form, body_color: e.target.value })}
                className="w-10 h-10 rounded-lg border border-white/10 bg-transparent cursor-pointer"
              />
              <span className="text-[#9fcabd] text-sm font-mono">{form.body_color}</span>
            </div>
          </div>

          <div>
            <label className="block text-[#9fcabd] text-xs mb-1.5">Registry expiration</label>
            <input
              type="date"
              required
              value={form.registry_expiration}
              onChange={(e) => setForm({ ...form, registry_expiration: e.target.value })}
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
              disabled={isSubmitting || owners.length === 0}
              className="flex-1 bg-[#1D9E75] text-[#04342C] font-semibold rounded-xl py-2.5 text-sm disabled:opacity-60"
            >
              {isSubmitting ? "Adding..." : "Add vehicle"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Vehicles() {
  const { mustChangePassword, setMustChangePassword } = useAuth();
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  const [vehicles, setVehicles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState(null);
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [vehiclePendingDelete, setVehiclePendingDelete] = useState(null);
  const [deletingVehicleId, setDeletingVehicleId] = useState(null);

  useEffect(() => {
    setShowPasswordModal(mustChangePassword);
  }, [mustChangePassword]);

  const loadVehicles = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getVehicles();
      setVehicles(data);
    } catch (err) {
      setError(err.message || "Failed to load vehicles.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadVehicles();
  }, []);

  const filteredVehicles = useMemo(() => {
    return vehicles.filter((v) => v.plate_number.toLowerCase().includes(search.toLowerCase()));
  }, [vehicles, search]);

  const handleDeleteVehicle = async () => {
    if (!vehiclePendingDelete) return;
    const vehicle = vehiclePendingDelete;
    setDeletingVehicleId(vehicle.vehicle_id);
    try {
      await deleteVehicle(vehicle.vehicle_id);
      await loadVehicles();
      setToast({ type: "success", message: `${vehicle.plate_number} was deleted successfully.` });
      setVehiclePendingDelete(null);
    } catch (err) {
      setToast({ type: "error", message: err.message || "Failed to delete vehicle." });
    } finally {
      setDeletingVehicleId(null);
    }
  };

  return (
      <main>
        <Toast toast={toast} onDismiss={() => setToast(null)} />
        <PageHeader title={"Vehicles"}/>

        <div className="flex items-center gap-3 mb-4">
          <input
            type="text"
            placeholder="Search for a vehicle..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-[#eafff5] text-sm outline-none focus:border-[#1D9E75] max-w-xs"
          />
          <button
            onClick={()=> {setShowAddModal(true)}}
            className="ml-auto bg-[#1D9E75] text-[#04342C] font-semibold rounded-xl px-5 py-2.5 text-sm"
          >
            + Add new vehicle
          </button>
        </div>

        {error && (
          <div className="bg-[#3A1B14] text-[#D98B72] text-sm rounded-xl px-4 py-3 mb-4">
            {error}
          </div>
        )}

        <div className="bg-[#0a2420] rounded-2xl overflow-hidden">
          <div className="bg-white/5 px-5 py-2 text-[#5DCAA5] text-xs">
            {filteredVehicles.length} vehicles
          </div>

          {isLoading ? (
            <p className="text-[#9fcabd] text-sm p-5">Loading vehicles...</p>
          ) : filteredVehicles.length === 0 ? (
            <p className="text-[#9fcabd] text-sm p-5">No vehicles found.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[#9fcabd] text-xs text-left">
                  <th className="px-5 py-3 font-medium">Plate number</th>
                  <th className="px-5 py-3 font-medium">Body number</th>
                  <th className="px-5 py-3 font-medium">Owner</th>
                  <th className="px-5 py-3 font-medium">Body color</th>
                  <th className="px-5 py-3 font-medium">Date added</th>
                  <th className="px-5 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredVehicles.map((v) => (
                  <tr key={v.vehicle_id} className="group border-t border-white/5">
                    <td className="px-5 py-3 text-[#eafff5]">{v.plate_number}</td>
                    <td className="px-5 py-3 text-[#9fcabd]">{v.body_number}</td>
                    <td className="px-5 py-3 text-[#9fcabd]">
                      {v.owner ? `${v.owner.first_name} ${v.owner.last_name}` : "—"}
                    </td>
                    <td className="px-5 py-3">
                      <ColorSwatch hex={v.body_color} />
                    </td>
                    <td className="px-5 py-3 text-[#9fcabd]">
                      {new Date(v.created_on).toLocaleDateString("en-US", {
                        month: "long", day: "numeric", year: "numeric",
                      })}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                        <button title="Edit Vehicle" aria-label="Edit Vehicle" onClick={() => setEditingVehicle(v)} className="rounded-lg p-1.5 text-[#5DCAA5] hover:bg-white/10"><Edit3 size={15} /></button>
                        <button title="Delete Vehicle" aria-label="Delete Vehicle" onClick={() => setVehiclePendingDelete(v)} className="rounded-lg p-1.5 text-[#D98B72] hover:bg-white/10"><Trash2 size={15} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        {showAddModal && (
          <AddVehicleModal
            onClose={() => setShowAddModal(false)}
            onSuccess={(vehicle) => {
              setShowAddModal(false);
              loadVehicles();
              setToast({ type: "success", message: `${vehicle.plate_number} was added successfully.` });
            }}
            onError={(message) => setToast({ type: "error", message })}
          />
        )}
        {editingVehicle && (
          <EditVehicleModal
            vehicle={editingVehicle}
            onClose={() => setEditingVehicle(null)}
            onSuccess={async (vehicle) => {
              await loadVehicles();
              setEditingVehicle(null);
              setToast({ type: "success", message: `${vehicle.plate_number} was updated successfully.` });
            }}
            onError={(message) => setToast({ type: "error", message })}
          />
        )}
        <VehicleDeleteConfirmModal
          vehicle={vehiclePendingDelete}
          isSubmitting={deletingVehicleId === vehiclePendingDelete?.vehicle_id}
          onClose={() => !deletingVehicleId && setVehiclePendingDelete(null)}
          onConfirm={handleDeleteVehicle}
        />

        {showPasswordModal && (
          <ChangePasswordModal
            onClose={() => setShowPasswordModal(false)}
            onSuccess={() => {
              setMustChangePassword(false);
              setShowPasswordModal(false);
            }}
          />
        )}
      </main>
    
  );
}

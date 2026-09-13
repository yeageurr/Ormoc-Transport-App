import { useState, useEffect, useMemo } from "react";
import ChangePasswordModal from "../../components/modals/ChangePasswordModal";
import PageHeader from "../../components/ui/PageHeader";
import CreateDispatchModal from "../../components/modals/CreateDispatchModal";
import { useAuth } from "../../context/AuthContext";
import { createDispatchBatch, getDispatches } from "../../api/dispatchAPI";
import Toast from "../../components/ui/Toast";
import { getDrivers } from "../../api/usersAPI";
import { getVehicles } from "../../api/vehiclesAPI";
import { getRoutes } from "../../api/routesAPI";


export default function DispatchLog() {
  const { mustChangePassword, setMustChangePassword } = useAuth();
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const [dispatches, setDispatches] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [drafts, setDrafts] = useState([]);
  const [isSavingBatch, setIsSavingBatch] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    setShowPasswordModal(mustChangePassword);
  }, [mustChangePassword]);

  const loadAll = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [dispatchData, driverData, vehicleData, routeData] = await Promise.all([
        getDispatches(),
        getDrivers(),
        getVehicles(),
        getRoutes(),
      ]);
      setDispatches(dispatchData);
      setDrivers(driverData);
      setVehicles(vehicleData);
      setRoutes(routeData);
    } catch (err) {
      setError(err.message || "Failed to load dispatch log.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  // Route/driver/vehicle names aren't embedded in the dispatch response —
  // built as client-side lookup maps instead of reworking the backend for
  // a table this small (5 routes, handful of drivers/vehicles).
  const routeMap = useMemo(() => Object.fromEntries(routes.map((r) => [r.route_id, r.destination?.name])), [routes]);
  const driverMap = useMemo(() => Object.fromEntries(drivers.map((d) => [d.user_id, `${d.first_name} ${d.last_name}`])), [drivers]);
  const vehicleMap = useMemo(() => Object.fromEntries(vehicles.map((v) => [v.vehicle_id, v.plate_number])), [vehicles]);

  const filteredDispatches = useMemo(() => {
    return dispatches.filter((d) => {
      const routeName = (routeMap[d.route_id] || "").toLowerCase();
      const dateStr = new Date(d.effective_on).toLocaleDateString("en-US").toLowerCase();
      return routeName.includes(search.toLowerCase()) || dateStr.includes(search.toLowerCase());
    });
  }, [dispatches, routeMap, search]);

  const batchDate = drafts[0] ? new Date(drafts[0].effective_on).toLocaleDateString("en-CA") : null;
  const stageDispatch = (draft) => {
    if (drafts.some((item) => item.driver_id === draft.driver_id || item.vehicle_id === draft.vehicle_id)) {
      setToast({ type: "error", message: "A driver and vehicle can only be staged once in a batch." });
      return;
    }
    setDrafts([...drafts, draft]);
    setShowCreateModal(false);
  };
  const saveBatch = async () => {
    setIsSavingBatch(true);
    try { await createDispatchBatch(drafts); setDrafts([]); await loadAll(); setToast({ type: "success", message: "Dispatch batch saved successfully." }); }
    catch (err) { setToast({ type: "error", message: err.message || "Failed to save dispatch batch." }); }
    finally { setIsSavingBatch(false); }
  };

  return (
      <main>
        <Toast toast={toast} onDismiss={() => setToast(null)} />
        <PageHeader title={"Dispatch"} />

        <div className="flex items-center gap-3 mb-4">
          <input
            type="text"
            placeholder="Search route or date..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-[#eafff5] text-sm outline-none focus:border-[#1D9E75] max-w-xs"
          />
          <button
            onClick={() => setShowCreateModal(true)}
            className="ml-auto bg-[#1D9E75] text-[#04342C] font-semibold rounded-xl px-5 py-2.5 text-sm"
          >
            + Create new dispatch
          </button>
        </div>

        {drafts.length > 0 && (
          <div className="mb-4 rounded-2xl border border-[#1D9E75]/40 bg-[#0a2420] p-4">
            <div className="mb-3 flex items-center justify-between"><div><h2 className="text-sm font-semibold text-[#eafff5]">Pending batch · {new Date(drafts[0].effective_on).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</h2><p className="text-xs text-[#9fcabd]">These dispatches are only staged until you confirm.</p></div><button onClick={saveBatch} disabled={isSavingBatch} className="rounded-xl bg-[#1D9E75] px-4 py-2 text-sm font-semibold text-[#04342C] disabled:opacity-50">{isSavingBatch ? "Saving..." : "Confirm and save"}</button></div>
            <div className="space-y-1">{drafts.map((draft, index) => <div key={`${draft.driver_id}-${draft.vehicle_id}`} className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2 text-sm text-[#9fcabd]"><span>{driverMap[draft.driver_id]} · {vehicleMap[draft.vehicle_id]} · Ormoc - {routeMap[draft.route_id]}</span><button title="Remove staged dispatch" onClick={() => setDrafts(drafts.filter((_, itemIndex) => itemIndex !== index))} className="text-[#D98B72]">Remove</button></div>)}</div>
          </div>
        )}

        {error && (
          <div className="bg-[#3A1B14] text-[#D98B72] text-sm rounded-xl px-4 py-3 mb-4">
            {error}
          </div>
        )}

        <div className="bg-[#0a2420] rounded-2xl overflow-hidden">
          <div className="bg-white/5 px-5 py-2 text-[#5DCAA5] text-xs">
            {filteredDispatches.length} dispatch records
          </div>

          {isLoading ? (
            <p className="text-[#9fcabd] text-sm p-5">Loading dispatch log...</p>
          ) : filteredDispatches.length === 0 ? (
            <p className="text-[#9fcabd] text-sm p-5">No dispatch records found.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[#9fcabd] text-xs text-left">
                  <th className="px-5 py-3 font-medium">Date</th>
                  <th className="px-5 py-3 font-medium">Route</th>
                  <th className="px-5 py-3 font-medium">Driver</th>
                  <th className="px-5 py-3 font-medium">Vehicle</th>
                  <th className="px-5 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredDispatches.map((d) => (
                  <tr key={d.dispatch_id} className="group border-t border-white/5">
                    <td className="px-5 py-3 text-[#eafff5]">
                      {new Date(d.effective_on).toLocaleDateString("en-US", {
                        month: "long", day: "numeric", year: "numeric",
                      })}
                    </td>
                    <td className="px-5 py-3 text-[#9fcabd]">Ormoc - {routeMap[d.route_id] || "—"}</td>
                    <td className="px-5 py-3 text-[#9fcabd]">{driverMap[d.driver_id] || "—"}</td>
                    <td className="px-5 py-3 text-[#9fcabd]">{vehicleMap[d.vehicle_id] || "—"}</td>
                    <td className="px-5 py-3"><div className="opacity-0 transition-opacity group-hover:opacity-100"><button title="View dispatch" className="text-xs text-[#5DCAA5]">View</button></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {showCreateModal && (
          <CreateDispatchModal
            isOpen={showCreateModal}
            drivers={drivers}
            vehicles={vehicles}
            routes={routes}
            onClose={() => setShowCreateModal(false)}
            onStage={stageDispatch}
            lockedDate={batchDate}
          />
        )}

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

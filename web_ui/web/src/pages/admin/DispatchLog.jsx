import { useEffect, useMemo, useState } from "react";
import { Pencil } from "lucide-react";
import ChangePasswordModal from "../../components/modals/ChangePasswordModal";
import CreateDispatchModal from "../../components/modals/CreateDispatchModal";
import DispatchReviewModal from "../../components/modals/DispatchReviewModal";
import EditDispatchModal from "../../components/modals/EditDispatchModal";
import SelectDispatchRouteModal from "../../components/modals/SelectDispatchRouteModal";
import PageHeader from "../../components/ui/PageHeader";
import Toast from "../../components/ui/Toast";
import { createDispatchBatch, getDispatches } from "../../api/dispatchAPI";
import { getRoutes } from "../../api/routesAPI";
import { getDrivers } from "../../api/usersAPI";
import { getVehicles } from "../../api/vehiclesAPI";
import { useAuth } from "../../context/AuthContext";

const phDate = (value) => {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Manila", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date(value));
  const get = (type) => parts.find((part) => part.type === type)?.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
};
const tomorrow = () => {
  const [year, month, day] = phDate(new Date()).split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
};
const displayDate = (date) => new Date(`${date}T00:00:00+08:00`).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

export default function DispatchLog() {
  const { mustChangePassword, setMustChangePassword } = useAuth();
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [step, setStep] = useState(null);
  const [routeId, setRouteId] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [dispatches, setDispatches] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState(null);
  const [editingGroup, setEditingGroup] = useState(null);
  const [addingToGroup, setAddingToGroup] = useState(null);
  const effectiveDate = tomorrow();

  useEffect(() => setShowPasswordModal(mustChangePassword), [mustChangePassword]);
  const loadAll = async () => {
    setIsLoading(true); setError(null);
    try {
      const [log, driverList, vehicleList, routeList] = await Promise.all([getDispatches(), getDrivers(), getVehicles(), getRoutes()]);
      setDispatches(log); setDrivers(driverList); setVehicles(vehicleList); setRoutes(routeList);
    } catch (loadError) { setError(loadError.message || "Failed to load dispatch log."); }
    finally { setIsLoading(false); }
  };
  useEffect(() => { loadAll(); }, []);

  const routeMap = useMemo(() => Object.fromEntries(routes.map((route) => [route.route_id, route.destination?.name || `Route #${route.route_id}`])), [routes]);
  const driverMap = useMemo(() => Object.fromEntries(drivers.map((driver) => [driver.user_id, `${driver.first_name} ${driver.last_name}`])), [drivers]);
  const vehicleMap = useMemo(() => Object.fromEntries(vehicles.map((vehicle) => [vehicle.vehicle_id, vehicle.plate_number])), [vehicles]);
  const vehicleDetails = useMemo(() => Object.fromEntries(vehicles.map((vehicle) => [vehicle.vehicle_id, vehicle])), [vehicles]);
  const availableRoutes = useMemo(() => routes.filter((route) => !dispatches.some((dispatch) => dispatch.route_id === route.route_id && phDate(dispatch.effective_on) === effectiveDate)), [routes, dispatches, effectiveDate]);
  const groups = useMemo(() => {
    const byRouteAndDate = new Map();
    dispatches.forEach((dispatch) => {
      const date = phDate(dispatch.effective_on); const key = `${date}-${dispatch.route_id}`;
      if (!byRouteAndDate.has(key)) byRouteAndDate.set(key, { key, date, routeId: dispatch.route_id, assignments: [] });
      byRouteAndDate.get(key).assignments.push(dispatch);
    });
    return [...byRouteAndDate.values()].filter((group) => `${displayDate(group.date)} ${routeMap[group.routeId] || ""}`.toLowerCase().includes(search.toLowerCase()));
  }, [dispatches, routeMap, search]);

  const closeCreation = () => { setStep(null); setRouteId(null); setAssignments([]); };
  const beginReview = (selectedRouteId) => { setRouteId(selectedRouteId); setAssignments([]); setStep("review"); };
  const save = async () => {
    setIsSaving(true);
    try {
      await createDispatchBatch(assignments.map((assignment) => ({ ...assignment, route_id: routeId, effective_on: `${effectiveDate}T00:00:00+08:00` })));
      closeCreation(); await loadAll(); setToast({ type: "success", message: "Dispatch saved successfully." });
    } catch (saveError) { setToast({ type: "error", message: saveError.message || "Failed to save dispatch." }); }
    finally { setIsSaving(false); }
  };
  const addToSavedDispatch = async (assignment) => {
    try {
      const created = await createDispatchBatch([{ ...assignment, route_id: addingToGroup.routeId, effective_on: `${addingToGroup.date}T00:00:00+08:00` }]);
      setEditingGroup((current) => ({ ...current, assignments: [...current.assignments, ...created] }));
      setAddingToGroup(null); await loadAll(); setToast({ type: "success", message: "Driver added to dispatch." });
    } catch (saveError) { setToast({ type: "error", message: saveError.message || "Failed to add driver." }); }
  };

  return <main>
    <Toast toast={toast} onDismiss={() => setToast(null)} />
    <PageHeader title="Dispatch" />
    <div className="mb-4 flex items-center gap-3"><input type="text" placeholder="Search route or date..." value={search} onChange={(event) => setSearch(event.target.value)} className="max-w-xs flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-[#eafff5] outline-none focus:border-[#1D9E75]" /><button onClick={() => setStep("route")} className="ml-auto rounded-xl bg-[#1D9E75] px-5 py-2.5 text-sm font-semibold text-[#04342C]">+ Create new dispatch</button></div>
    {error && <div className="mb-4 rounded-xl bg-[#3A1B14] px-4 py-3 text-sm text-[#D98B72]">{error}</div>}
    <div className="overflow-hidden rounded-2xl bg-[#0a2420]"><div className="bg-white/5 px-5 py-2 text-xs text-[#5DCAA5]">{groups.length} dispatch records</div>{isLoading ? <p className="p-5 text-sm text-[#9fcabd]">Loading dispatch log...</p> : !groups.length ? <p className="p-5 text-sm text-[#9fcabd]">No dispatch records found.</p> : <table className="w-full text-sm"><thead><tr className="text-left text-xs text-[#9fcabd]"><th className="px-5 py-3 font-medium">Effective date</th><th className="px-5 py-3 font-medium">Route</th><th className="px-5 py-3 font-medium">Assigned drivers</th><th className="px-5 py-3 font-medium">Actions</th></tr></thead><tbody>{groups.map((group) => { const editable = group.date > phDate(new Date()); return <tr key={group.key} className="group border-t border-white/5"><td className="px-5 py-3 text-[#eafff5]">{displayDate(group.date)}</td><td className="px-5 py-3 text-[#9fcabd]">Ormoc - {routeMap[group.routeId] || "—"}</td><td className="px-5 py-3 text-[#9fcabd]">{group.assignments.length}</td><td className="px-5 py-3"><button onClick={() => setEditingGroup(group)} disabled={!editable} title={editable ? "Edit dispatch" : "Current and past dispatches are finalized"} aria-label="Edit dispatch" className="text-[#5DCAA5] opacity-0 transition-opacity group-hover:opacity-100 disabled:cursor-not-allowed disabled:text-[#9fcabd]/50 disabled:group-hover:opacity-0"><Pencil size={16} /></button></td></tr>; })}</tbody></table>}</div>
    {step === "route" && <SelectDispatchRouteModal routes={availableRoutes} onClose={closeCreation} onProceed={beginReview} />}
    {step === "review" && <DispatchReviewModal routeName={`Ormoc - ${routeMap[routeId] || "—"}`} effectiveDate={displayDate(effectiveDate)} assignments={assignments} driverMap={driverMap} vehicleMap={vehicleMap} vehicleDetails={vehicleDetails} isSaving={isSaving} onClose={closeCreation} onAddDriver={() => setStep("assignment")} onRemove={(index) => setAssignments((current) => current.filter((_, itemIndex) => itemIndex !== index))} onConfirm={save} />}
    {step === "assignment" && <CreateDispatchModal drivers={drivers} vehicles={vehicles} assignedDriverIds={assignments.map((assignment) => assignment.driver_id)} assignedVehicleIds={assignments.map((assignment) => assignment.vehicle_id)} onClose={() => setStep("review")} onStage={(assignment) => { setAssignments((current) => [...current, assignment]); setStep("review"); }} />}
    {editingGroup && !addingToGroup && <EditDispatchModal group={editingGroup} routeName={`Ormoc - ${routeMap[editingGroup.routeId] || "—"}`} effectiveDate={displayDate(editingGroup.date)} driverMap={driverMap} vehicleMap={vehicleMap} vehicleDetails={vehicleDetails} onClose={() => setEditingGroup(null)} onAddDriver={() => setAddingToGroup(editingGroup)} />}
    {addingToGroup && <CreateDispatchModal drivers={drivers} vehicles={vehicles} assignedDriverIds={addingToGroup.assignments.map((assignment) => assignment.driver_id)} assignedVehicleIds={addingToGroup.assignments.map((assignment) => assignment.vehicle_id)} onClose={() => setAddingToGroup(null)} onStage={addToSavedDispatch} />}
    {showPasswordModal && <ChangePasswordModal onClose={() => setShowPasswordModal(false)} onSuccess={() => { setMustChangePassword(false); setShowPasswordModal(false); }} />}
  </main>;
}

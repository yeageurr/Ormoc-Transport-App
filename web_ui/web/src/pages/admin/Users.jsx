import { useState, useEffect, useMemo } from "react";
import AddUserModal from "../../components/modals/AddUserModal";
import UserActionConfirmModal from "../../components/modals/UserActionConfirmModal";
import Toast from "../../components/ui/Toast";
import {
  getDrivers,
  suspendDriver,
  reactivateDriver,
  deleteDriver,
} from "../../api/usersAPI";
import { Power, RotateCcw, Trash2, Users as UsersIcon } from 'lucide-react';
import { AdminSearchField, adminCreateButtonClassName, adminFilterClassName } from "../../components/ui/AdminToolbarControls";
import setTitle from "../../components/pageTitle";

export default function Users() {
  setTitle('Driver Accounts');
  const [isAddUserModalOpen, setShowAddUserModal] = useState(false)

  const [drivers, setDrivers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [actioningId, setActioningId] = useState(null);
  const [pendingAction, setPendingAction] = useState(null);
  const [toast, setToast] = useState(null);

  const UserAccountStatus = [
    { value: "all", label: "All Status" },
    { value: "active", label: "Active" },
    { value: "suspended", label: "Suspended" },
    { value: "disabled", label: "Deactivated" },
  ]

  const loadDrivers = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getDrivers();
      setDrivers(data);
    } catch (err) {
      setError(err.message || "Failed to load users.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDrivers();
  }, []);

  const filteredDrivers = useMemo(() => {
    return drivers.filter((driver) => {
      const fullName = `${driver.first_name} ${driver.last_name} ${driver.driver_id ?? ""} ${driver.contact_number ?? ""} ${driver.vehicle_plate_number ?? ""}`.toLowerCase();
      const matchesSearch = fullName.includes(search.toLowerCase());
      const status = driver.account?.status;
      const matchesStatus = statusFilter === "all" || status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [drivers, search, statusFilter]);

  const showToast = (type, message) => setToast({ type, message });

  const handleConfirmedAction = async () => {
    if (!pendingAction) return;

    const { type, driver } = pendingAction;
    setActioningId(driver.user_id);
    try {
      if (type === "reactivate") {
        await reactivateDriver(driver.user_id);
      } else if (type === "suspend") {
        await suspendDriver(driver.user_id);
      } else {
        await deleteDriver(driver.user_id);
      }
      await loadDrivers();
      const verb = type === "reactivate" ? "reactivated" : type === "suspend" ? "suspended" : "deactivated";
      showToast("success", `${driver.first_name} ${driver.last_name} has been ${verb}.`);
    } catch (err) {
      await loadDrivers();
      showToast("error", err?.response?.data?.detail || err.message || "Action failed. Please try again.");
    } finally {
      setActioningId(null);
      setPendingAction(null);
    }
  };

  const statusBadge = (status) => {
    const styles = { active: "text-[#008b43]", suspended: "text-[#c17b00]", disabled: "text-[#c1363b]" };
    return (
      <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold capitalize ${styles[status] || styles.disabled}`}>
        <span className="h-[5px] w-[5px] rounded-full bg-current" />{status === "disabled" ? "Deactivated" : status}
      </span>
    );
  };

  return (
      <div className="flex min-h-0 flex-1 flex-col">
        <Toast toast={toast} onDismiss={() => setToast(null)} />
        <div className="mb-3 flex shrink-0 flex-wrap items-center justify-between gap-3 px-[5px]">
          <h1 className="m-0 text-[22px] font-bold text-[#244659]">Driver Accounts</h1>
        </div>

        <div className="mb-3 flex shrink-0 flex-wrap items-center justify-between gap-2 px-[5px]">
          <AdminSearchField value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search drivers, phone, plate..." />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className={adminFilterClassName}
          >
            {UserAccountStatus.map(({value, label}) => (
              <option
                key={value}
                value={value}
                className="text-[#000]"
              >
                {label}
              </option>
            ))}
          </select>
          <button
            className={adminCreateButtonClassName}
            onClick={() => {setShowAddUserModal(true)}}
          >
            Add Driver + Vehicle
          </button>
        </div>

        {error && (
          <div className="mb-3 shrink-0 rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {error}
          </div>
        )}

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[5px] border border-[#a8d5e8] bg-white px-[10px] py-[7px]">
          <div className="shrink-0 border-b border-[#e3edf1] px-[9px] py-2 text-[10px] text-[#647c87]">
            {filteredDrivers.length} drivers
          </div>

          {isLoading ? (
            <p className="p-5 text-sm text-[#718792]">Loading drivers…</p>
          ) : filteredDrivers.length === 0 ? (
            <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 py-10 text-center text-[#718792]">
              <UsersIcon size={44} strokeWidth={1.3} />
              <p className="m-0 text-xl font-semibold">No drivers found</p>
              <p className="m-0 text-xs">Try another search or status filter.</p>
            </div>
          ) : (
            <div className="min-h-0 flex-1 overflow-auto"><table className="w-full min-w-[800px] border-collapse text-left text-[11px] text-[#29485a]">
              <thead className="sticky top-0 z-10 bg-white">
                <tr>
                  <th className="border-b border-[#9daeb7] px-[9px] py-[10px] font-semibold">Name</th>
                  <th className="border-b border-[#9daeb7] px-[9px] py-[10px] font-semibold">Driver ID</th>
                  <th className="border-b border-[#9daeb7] px-[9px] py-[10px] font-semibold">Vehicle Plate</th>
                  <th className="border-b border-[#9daeb7] px-[9px] py-[10px] font-semibold">Email</th>
                  <th className="border-b border-[#9daeb7] px-[9px] py-[10px] font-semibold">Contact #</th>
                  <th className="border-b border-[#9daeb7] px-[9px] py-[10px] font-semibold">Status</th>
                  <th className="border-b border-[#9daeb7] px-[9px] py-[10px] font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredDrivers.map((driver) => (
                  <tr key={driver.user_id} className="h-[42px] border-b border-[#9daeb7] last:border-b-0 hover:bg-[#f5fbff]">
                    <td className="px-[9px] py-0 font-medium text-[#29485a]">
                      {driver.first_name} {driver.last_name}
                    </td>
                    <td className="px-[9px] py-0">{driver.driver_id || "—"}</td>
                    <td className="px-[9px] py-0 font-semibold">{driver.vehicle_plate_number?.toUpperCase() || "—"}</td>
                    <td className="px-[9px] py-0">{driver.email || "—"}</td>
                    <td className="px-[9px] py-0">{driver.contact_number}</td>
                    <td className="px-[9px] py-0">{statusBadge(driver.account?.status)}</td>
                    <td className="px-[9px] py-0">
                      <div className="flex items-center gap-2">
                        <button
                          title={driver.account?.status === "active" ? "Suspend User" : "Reactivate User"}
                          aria-label={driver.account?.status === "active" ? "Suspend User" : "Reactivate User"}
                          className="rounded p-1.5 text-[#b57600] transition-colors hover:bg-[#fff4d9] disabled:opacity-40"
                          disabled={actioningId === driver.user_id}
                          onClick={() => setPendingAction({ type: driver.account?.status === "active" ? "suspend" : "reactivate", driver })}
                        >{driver.account?.status === "active" ? <Power size={15} /> : <RotateCcw size={15} />}</button>
                        <button
                          title="Deactivate User"
                          aria-label="Deactivate User"
                          className="rounded p-1.5 text-[#c1363b] transition-colors hover:bg-[#fff0f0] disabled:opacity-40"
                          disabled={actioningId === driver.user_id || driver.account?.status === "disabled"}
                          onClick={() => setPendingAction({ type: "delete", driver })}
                        ><Trash2 size={15} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table></div>
          )}
        </div>

        <AddUserModal
          isOpen={isAddUserModalOpen}
          onClose={() => setShowAddUserModal(false)}
          onSuccess={async (driver) => {
            await loadDrivers();
            setShowAddUserModal(false);
            showToast("success", `${driver.first_name} ${driver.last_name} was created successfully.`);
          }}
          onError={(message) => showToast("error", message)}
        />
        <UserActionConfirmModal
          action={pendingAction?.type}
          driver={pendingAction?.driver}
          isSubmitting={actioningId === pendingAction?.driver.user_id}
          onClose={() => !actioningId && setPendingAction(null)}
          onConfirm={handleConfirmedAction}
        />
      </div>
  );
}

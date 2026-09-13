import { useState, useEffect, useMemo } from "react";
import ChangePasswordModal from "../../components/modals/ChangePasswordModal";
import { useAuth } from "../../context/AuthContext";
import PageHeader from "../../components/ui/PageHeader";
import AddUserModal from "../../components/modals/AddUserModal";
import UserActionConfirmModal from "../../components/modals/UserActionConfirmModal";
import EditUserModal from "../../components/modals/EditUserModal";
import Toast from "../../components/ui/Toast";
import {
  getDrivers,
  suspendDriver,
  reactivateDriver,
  deleteDriver,
} from "../../api/usersAPI";
import { Edit3, Power, RotateCcw, Search, Trash2 } from 'lucide-react';

export default function Users() {
  const { mustChangePassword, setMustChangePassword } = useAuth();
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [isAddUserModalOpen, setShowAddUserModal] = useState(false)

  const [drivers, setDrivers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [actioningId, setActioningId] = useState(null);
  const [pendingAction, setPendingAction] = useState(null);
  const [toast, setToast] = useState(null);
  const [editingDriver, setEditingDriver] = useState(null);

  const UserAccountStatus = [
    { value: "all", label: "All Status" },
    { value: "active", label: "Active" },
    { value: "suspended", label: "Suspended" },
    { value: "disabled", label: "Disabled" },
  ]

  useEffect(() => {
    setShowPasswordModal(mustChangePassword);
  }, [mustChangePassword]);

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
      const fullName = `${driver.first_name} ${driver.last_name}`.toLowerCase();
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
      const verb = type === "reactivate" ? "reactivated" : type === "suspend" ? "suspended" : "disabled";
      showToast("success", `${driver.first_name} ${driver.last_name} has been ${verb}.`);
    } catch (err) {
      showToast("error", err.message || "Action failed. Please try again.");
    } finally {
      setActioningId(null);
      setPendingAction(null);
    }
  };

  const statusBadge = (status) => {
    const styles = {
      active: "bg-[#0F6E56] text-[#9FE1CB]",
      suspended: "bg-[#4A1B0C] text-[#F0997B]",
      disabled: "bg-white/10 text-[#9fcabd]",
    };
    return (
      <span className={`text-xs font-medium px-3 py-1 rounded-full capitalize ${styles[status] || styles.disabled}`}>
        {status}
      </span>
    );
  };

  return (

      <>
        <Toast toast={toast} onDismiss={() => setToast(null)} />
        <PageHeader title={"Users"}/>

        <div className="flex items-center justify-between h-11 gap-3 mb-4">
          <div className="relative w-max h-full">
            <Search size={'18px'} stroke="var(--placeholder-fg)" className="absolute top-1/2 left-5 -translate-x-1/2 -translate-y-1/2" />

            <input
            type="text"
            placeholder="Search for route..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="text-[#fff] font-poppins bg-transparent h-full w-60 px-10 border border-[var(--stroke-color)] rounded-[var(--input-radius)] outline-none focus:border-[var(--stroke-color-focus)] transition-colors placeholder:text-[var(--placeholder-fg)] placeholder:font-inter placeholder:font-light placeholder:text-[13px]]"
            />
          </div>
          
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-transparent border border-[var(--stroke-color)] rounded-xl px-4 py-2.5 text-[#9fcabd] text-sm outline-none"
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
            className="ml-auto bg-[var(--button-bg)] text-[#000] font-inter font-medium rounded-[var(--corner-radius-btn)] px-5 py-2.5 text-[14px]"
            onClick={() => {setShowAddUserModal(true)}}
          >
            + Add user
          </button>
        </div>

        {error && (
          <div className="bg-[#3A1B14] text-[#D98B72] text-sm rounded-xl px-4 py-3 mb-4">
            {error}
          </div>
        )}

        <div className="bg-[#0a2420] rounded-[var(--table-corner-radius)] overflow-hidden border border-[#78EDFF]/25">
          <div className="bg-white/5 px-5 py-2 text-[#5DCAA5] text-xs">
            {filteredDrivers.length} users
          </div>

          {isLoading ? (
            <p className="text-[#9fcabd] text-sm p-5">Loading users...</p>
          ) : filteredDrivers.length === 0 ? (
            <p className="text-[#9fcabd] text-sm p-5">No users found.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[#9fcabd] text-xs text-left">
                  <th className="px-5 py-3 font-medium">Name</th>
                  <th className="px-5 py-3 font-medium">Email</th>
                  <th className="px-5 py-3 font-medium">Contact #</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredDrivers.map((driver) => (
                  <tr key={driver.user_id} className="group border-t border-white/5">
                    <td className="px-5 py-3 text-[#eafff5]">
                      {driver.first_name} {driver.last_name}
                    </td>
                    <td className="px-5 py-3 text-[#9fcabd]">{driver.email || "—"}</td>
                    <td className="px-5 py-3 text-[#9fcabd]">{driver.contact_number}</td>
                    <td className="px-5 py-3">{statusBadge(driver.account?.status)}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                        <button title="Edit User" aria-label="Edit User" disabled={driver.account?.status === "disabled"} className="rounded-lg p-1.5 text-[#5DCAA5] hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-30" onClick={() => setEditingDriver(driver)}><Edit3 size={15} /></button>
                        <button
                          title={driver.account?.status === "active" ? "Suspend User" : "Reactivate User"}
                          aria-label={driver.account?.status === "active" ? "Suspend User" : "Reactivate User"}
                          className="rounded-lg p-1.5 text-[#F0B55B] hover:bg-white/10 disabled:opacity-40"
                          disabled={actioningId === driver.user_id}
                          onClick={() => setPendingAction({ type: driver.account?.status === "active" ? "suspend" : "reactivate", driver })}
                        >{driver.account?.status === "active" ? <Power size={15} /> : <RotateCcw size={15} />}</button>
                        <button
                          title="Disable User"
                          aria-label="Disable User"
                          className="rounded-lg p-1.5 text-[#D98B72] hover:bg-white/10 disabled:opacity-40"
                          disabled={actioningId === driver.user_id || driver.account?.status === "disabled"}
                          onClick={() => setPendingAction({ type: "delete", driver })}
                        ><Trash2 size={15} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {showPasswordModal && (
          <ChangePasswordModal
            onClose={() => setShowPasswordModal(false)}
            onSuccess={() => {
              setMustChangePassword(false);
              setShowPasswordModal(false);
            }}
          />
        )}

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
        {editingDriver && <EditUserModal driver={editingDriver} onClose={() => setEditingDriver(null)} onSuccess={async (driver) => { await loadDrivers(); setEditingDriver(null); showToast("success", `${driver.first_name} ${driver.last_name} was updated successfully.`); }} onError={(message) => showToast("error", message)} />}
      </>
  );
}

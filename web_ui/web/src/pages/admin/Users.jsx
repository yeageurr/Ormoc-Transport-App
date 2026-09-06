import { useState, useEffect, useMemo } from "react";
import Sidebar from "../../components/layout/Sidebar";
import ChangePasswordModal from "../../components/modals/ChangePasswordModal";
import { useAuth } from "../../context/AuthContext";
import PageHeader from "../../components/ui/PageHeader";
import AddUserModal from "../../components/modals/AddUserModal";
import {
  getDrivers,
  suspendDriver,
  reactivateDriver,
  deleteDriver,
} from "../../api/usersAPI";

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

  useEffect(() => {
    setShowPasswordModal(mustChangePassword);
  }, [mustChangePassword]);

  const handleAddUser = (newUser) => {
    setUsers((prev) => [newUser, ...prev]);
  };

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

  const handleSuspendToggle = async (driver) => {
    setActioningId(driver.user_id);
    try {
      if (driver.account?.status === "suspended") {
        await reactivateDriver(driver.user_id);
      } else {
        await suspendDriver(driver.user_id);
      }
      await loadDrivers();
    } catch (err) {
      setError(err.message || "Action failed.");
    } finally {
      setActioningId(null);
    }
  };

  const handleDelete = async (driver) => {
    const confirmed = window.confirm(
      `Disable ${driver.first_name} ${driver.last_name}'s account? This preserves their history but blocks login.`
    );
    if (!confirmed) return;

    setActioningId(driver.user_id);
    try {
      await deleteDriver(driver.user_id);
      await loadDrivers();
    } catch (err) {
      setError(err.message || "Failed to disable account.");
    } finally {
      setActioningId(null);
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
        <PageHeader title={"Users"}/>

        <div className="flex items-center gap-3 mb-4">
          <input
            type="text"
            placeholder="Search for route..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-[#eafff5] text-sm outline-none focus:border-[#1D9E75] transition-colors max-w-xs placeholder:text-[var(--placeholder-fg)] placeholder:font-inter placeholder:font-light placeholder:text-[13px]]"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-[#9fcabd] text-sm outline-none"
          >
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
            <option value="disabled">Disabled</option>
          </select>
          <button 
            className="ml-auto bg-[#1D9E75] text-[#04342C] font-semibold rounded-xl px-5 py-2.5 text-sm"
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

        <div className="bg-[#0a2420] rounded-2xl overflow-hidden">
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
                  <tr key={driver.user_id} className="border-t border-white/5">
                    <td className="px-5 py-3 text-[#eafff5]">
                      {driver.first_name} {driver.last_name}
                    </td>
                    <td className="px-5 py-3 text-[#9fcabd]">{driver.email || "—"}</td>
                    <td className="px-5 py-3 text-[#9fcabd]">{driver.contact_number}</td>
                    <td className="px-5 py-3">{statusBadge(driver.account?.status)}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <button
                          className="text-[#5DCAA5] text-xs disabled:opacity-40"
                          disabled={actioningId === driver.user_id || driver.account?.status === "disabled"}
                          onClick={() => handleSuspendToggle(driver)}
                        >
                          {driver.account?.status === "suspended" ? "Reactivate" : "Suspend"}
                        </button>
                        <button
                          className="text-[#D98B72] text-xs disabled:opacity-40"
                          disabled={actioningId === driver.user_id || driver.account?.status === "disabled"}
                          onClick={() => handleDelete(driver)}
                        >
                          Delete
                        </button>
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
          onSuccess={
            () => {
              setShowAddUserModal(false);
            }
          }
        />
      </>
  );
}

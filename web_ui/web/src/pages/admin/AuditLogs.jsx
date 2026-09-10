import { useState, useEffect, useMemo } from "react";
import Sidebar from "../../components/layout/Sidebar";
import ChangePasswordModal from "../../components/modals/ChangePasswordModal";
import PageHeader from "../../components/ui/PageHeader";
import { useAuth } from "../../context/AuthContext";
import { getAuditLogs } from "../../api/auditlogsAPI";

const actionBadgeStyles = {
  create: "bg-[#0F6E56] text-[#9FE1CB]",
  update: "bg-[#0d4a6b] text-[#8ec8ea]",
  suspend: "bg-[#4A1B0C] text-[#F0997B]",
  resolve: "bg-[#0F6E56] text-[#9FE1CB]",
  delete: "bg-[#4A1B0C] text-[#F0997B]",
};

function ActionBadge({ action }) {
  return (
    <span className={`text-xs font-medium px-2.5 py-1 rounded-full capitalize ${actionBadgeStyles[action] || "bg-white/10 text-[#9fcabd]"}`}>
      {action}
    </span>
  );
}

const targetTableOptions = [
  { value: "", label: "All tables" },
  { value: "accounts", label: "Accounts" },
  { value: "users", label: "Users" },
  { value: "vehicles", label: "Vehicles" },
  { value: "incidents", label: "Incidents" },
  { value: "dispatch_logs", label: "Dispatch Logs" },
];

export default function AuditLogs() {
  const { mustChangePassword, setMustChangePassword } = useAuth();
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [targetTable, setTargetTable] = useState("");

  useEffect(() => {
    setShowPasswordModal(mustChangePassword);
  }, [mustChangePassword]);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await getAuditLogs({ targetTable: targetTable || undefined });
        setLogs(data);
      } catch (err) {
        setError(err.message || "Failed to load audit logs.");
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [targetTable]);

  const filteredLogs = useMemo(() => {
    return logs.filter((log) =>
      log.details.toLowerCase().includes(search.toLowerCase()) ||
      log.action.toLowerCase().includes(search.toLowerCase())
    );
  }, [logs, search]);

  return (
      <main>
        <div className="mb-6">
          <p className="text-[#9fcabd] text-sm">Hello, Administrator!</p>
          <h1 className="text-[#eafff5] text-2xl font-bold">Audit Logs</h1>
        </div>

        <div className="flex items-center gap-3 mb-4">
          <input
            type="text"
            placeholder="Search action or details..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-[#eafff5] text-sm outline-none focus:border-[#1D9E75] max-w-xs"
          />
          <select
            value={targetTable}
            onChange={(e) => setTargetTable(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-[#9fcabd] text-sm outline-none"
          >
            {targetTableOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        {error && (
          <div className="bg-[#3A1B14] text-[#D98B72] text-sm rounded-xl px-4 py-3 mb-4">
            {error}
          </div>
        )}

        <div className="bg-[#0a2420] rounded-2xl overflow-hidden">
          <div className="bg-white/5 px-5 py-2 text-[#5DCAA5] text-xs">
            {filteredLogs.length} entries
          </div>

          {isLoading ? (
            <p className="text-[#9fcabd] text-sm p-5">Loading audit logs...</p>
          ) : filteredLogs.length === 0 ? (
            <p className="text-[#9fcabd] text-sm p-5">No audit log entries found.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[#9fcabd] text-xs text-left">
                  <th className="px-5 py-3 font-medium">Date</th>
                  <th className="px-5 py-3 font-medium">Actor</th>
                  <th className="px-5 py-3 font-medium">Action</th>
                  <th className="px-5 py-3 font-medium">Target</th>
                  <th className="px-5 py-3 font-medium">Details</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((log) => (
                  <tr key={log.audit_id} className="border-t border-white/5">
                    <td className="px-5 py-3 text-[#eafff5]">
                      {new Date(log.created_at).toLocaleString("en-US", {
                        month: "long", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit",
                      })}
                    </td>
                    <td className="px-5 py-3 text-[#9fcabd]">{log.actor?.account_code || `#${log.actor_id}`}</td>
                    <td className="px-5 py-3"><ActionBadge action={log.action} /></td>
                    <td className="px-5 py-3 text-[#9fcabd] capitalize">
                      {log.target_table} #{log.target_id}
                    </td>
                    <td className="px-5 py-3 text-[#9fcabd]">{log.details}</td>
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
      </main>
  );
}

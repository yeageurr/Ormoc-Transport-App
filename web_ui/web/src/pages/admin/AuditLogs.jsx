import { useState, useEffect, useMemo } from "react";
import { ClipboardList } from "lucide-react";
import { getAuditLogs } from "../../api/auditlogsAPI";
import { AdminSearchField, adminFilterClassName } from "../../components/ui/AdminToolbarControls";
import setTitle from "../../components/pageTitle";

const actionBadgeStyles = {
  create: "bg-[#e9faf2] text-[#008b43]",
  update: "bg-[#eaf7fc] text-[#0879ac]",
  suspend: "bg-[#fff4df] text-[#a86a00]",
  resolve: "bg-[#e9faf2] text-[#008b43]",
  delete: "bg-[#fff0f0] text-[#c1363b]",
};

function ActionBadge({ action }) {
  return (
    <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize ${actionBadgeStyles[action] || "bg-[#edf4f7] text-[#526d79]"}`}>
      {action}
    </span>
  );
}

const targetTableOptions = [
  { value: "", label: "All activity" },
  { value: "accounts", label: "Accounts" },
  { value: "users", label: "Driver profiles" },
  { value: "vehicles", label: "Vehicles" },
  { value: "incidents", label: "Incidents" },
  { value: "dispatch_logs", label: "Dispatch logs" },
  { value: "dispatcher_assignments", label: "Dispatch assignments" },
  { value: "routes", label: "Routes" },
];

const phDate = (value) => {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Manila", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date(value));
  const get = (type) => parts.find((part) => part.type === type)?.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
};

const dateTime = (value) => new Intl.DateTimeFormat("en-US", {
  timeZone: "Asia/Manila",
  month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit",
}).format(new Date(value));

export default function AuditLogs() {
  setTitle('Audit Trail');

  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [targetTable, setTargetTable] = useState("");
  const [actorRole, setActorRole] = useState("");

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
    return logs.filter((log) => {
      const matchesSearch = `${log.details ?? ""} ${log.action ?? ""} ${log.target_table ?? ""} ${log.actor?.display_name ?? ""} ${log.actor?.account_code ?? ""}`.toLowerCase().includes(search.toLowerCase());
      const date = phDate(log.created_at);
      const matchesActorRole = actorRole === "system"
          ? log.actor_type === "system"
          : !actorRole || log.actor?.role === actorRole;
      return matchesSearch && matchesActorRole;
    });
  }, [actorRole, logs, search]);

  
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="mb-3 flex shrink-0 flex-wrap items-center justify-between gap-3 px-[5px]">
        <div>
          <h1 className="m-0 text-[24px] font-bold text-[#244659]">Audit Trail</h1>
        </div>
      </div>

      <div className="mb-3 flex shrink-0 flex-wrap items-center gap-2 px-[5px]">
        <AdminSearchField value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search action or details..." />
        <select
          value={targetTable}
          onChange={(e) => setTargetTable(e.target.value)}
          className={adminFilterClassName}
        >
          {targetTableOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <select value={actorRole} onChange={(event) => setActorRole(event.target.value)} className={adminFilterClassName} aria-label="Filter by actor">
          <option value="">All actors</option>
          <option value="admin">Admin</option>
          <option value="driver">Drivers</option>
          <option value="system">System actions</option>
        </select>
      </div>

      {error && (
        <div className="mb-3 shrink-0 rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </div>
      )}

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[5px] border border-[#a8d5e8] bg-white px-[10px] py-[7px]">
        <div className="shrink-0 border-b border-[#e3edf1] px-[9px] py-2 text-[11px] text-[#647c87]">
          {filteredLogs.length} entries
        </div>

        {isLoading ? (
          <p className="p-5 text-[15px] text-[#718792]">Loading audit trail…</p>
        ) : filteredLogs.length === 0 ? (
          <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 py-10 text-center text-[#718792]">
            <ClipboardList size={44} strokeWidth={1.3} />
            <p className="m-0 text-xl font-semibold">No audit records found</p>
            <p className="m-0 text-xs">Try another date, actor, or activity filter.</p>
          </div>
        ) : (
          <div className="min-h-0 flex-1 overflow-auto">
          <table className="w-full min-w-[900px] border-collapse text-left text-[13px] text-[#29485a]">
            <thead className="sticky top-0 z-10 bg-white">
              <tr>
                <th className="border-b border-[#9daeb7] px-[9px] py-[10px] font-semibold">Date</th>
                <th className="border-b border-[#9daeb7] px-[9px] py-[10px] font-semibold">Performed By</th>
                <th className="border-b border-[#9daeb7] px-[9px] py-[10px] font-semibold">Action</th>
                <th className="border-b border-[#9daeb7] px-[9px] py-[10px] font-semibold">Target</th>
                <th className="border-b border-[#9daeb7] px-[9px] py-[10px] font-semibold">Details</th>
                <th className="border-b border-[#9daeb7] px-[9px] py-[10px] font-semibold">Outcome</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((log) => (
                <tr key={log.audit_id} className="min-h-[42px] border-b border-[#9daeb7] last:border-0 hover:bg-[#f5fbff]">
                  <td className="px-[9px] py-[9px] text-[#29485a]">
                    {dateTime(log.created_at)}
                  </td>
                  <td className="px-[9px] py-[9px] text-[#29485a]">
                    <span>{log.actor?.display_name || log.actor?.account_code || (log.actor_id ? `#${log.actor_id}` : "System")}</span>
                    <span className="ml-2 text-[11px] capitalize text-[#718792]">{log.actor?.role?.replaceAll("_", " ") || log.actor_type}</span>
                  </td>
                  <td className="px-[9px] py-[9px]"><ActionBadge action={log.action} /></td>
                  <td className="px-[9px] py-[9px] capitalize text-[#526d79]">
                    {log.target_table} #{log.target_id}
                  </td>
                  <td className="px-[9px] py-[9px] text-[#526d79]">{log.details}</td>
                  <td className="px-[9px] py-[9px]"><span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize ${log.outcome === "success" ? "bg-[#e9faf2] text-[#008b43]" : "bg-[#fff0f0] text-[#c1363b]"}`}>{log.outcome || "success"}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>

    </div>
  );
}

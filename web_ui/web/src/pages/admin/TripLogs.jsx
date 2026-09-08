import { useState, useEffect, useMemo } from "react";
import PageHeader from "../../components/ui/PageHeader";
import ChangePasswordModal from "../../components/modals/ChangePasswordModal";
import { useAuth } from "../../context/AuthContext";
import { getAllTrips } from "../../api/tripsAPI";

function statusBadge(status) {
  const styles = {
    outgoing: "bg-[#0F6E56] text-[#9FE1CB]",
    returning: "bg-[#0d4a6b] text-[#8ec8ea]",
    completed: "bg-white/10 text-[#9fcabd]",
  };
  return (
    <span className={`text-xs font-medium px-2.5 py-1 rounded-full capitalize ${styles[status] || styles.completed}`}>
      {status}
    </span>
  );
}

export default function TripLogs() {
  const { mustChangePassword, setMustChangePassword } = useAuth();
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  const [trips, setTrips] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    setShowPasswordModal(mustChangePassword);
  }, [mustChangePassword]);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await getAllTrips();
        setTrips(data);
      } catch (err) {
        setError(err.message || "Failed to load trip logs.");
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  const filteredTrips = useMemo(() => {
    return trips.filter((trip) => {
      const driverName = trip.driver ? `${trip.driver.first_name} ${trip.driver.last_name}`.toLowerCase() : "";
      const routeName = (trip.route_label || "").toLowerCase();
      const matchesSearch = driverName.includes(search.toLowerCase()) || routeName.includes(search.toLowerCase());
      const matchesStatus = statusFilter === "all" || trip.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [trips, search, statusFilter]);

  const formatDateTime = (iso) =>
    new Date(iso).toLocaleString("en-US", {
      month: "long", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit",
    });

  return (
    <main>
      <PageHeader title={"Trip Logs"} />

      <div className="flex items-center gap-3 mb-4">
        <input
          type="text"
          placeholder="Search driver or route..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-[#eafff5] text-sm outline-none focus:border-[#1D9E75] max-w-xs"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-[#9fcabd] text-sm outline-none"
        >
          <option value="all">All trip statuses</option>
          <option value="outgoing">Outgoing</option>
          <option value="returning">Returning</option>
          <option value="completed">Completed</option>
        </select>
      </div>

      {error && (
        <div className="bg-[#3A1B14] text-[#D98B72] text-sm rounded-xl px-4 py-3 mb-4">
          {error}
        </div>
      )}

      <div className="bg-[#0a2420] rounded-2xl overflow-hidden">
        <div className="bg-white/5 px-5 py-2 text-[#5DCAA5] text-xs">
          {filteredTrips.length} trips
        </div>

        {isLoading ? (
          <p className="text-[#9fcabd] text-sm p-5">Loading trip logs...</p>
        ) : filteredTrips.length === 0 ? (
          <p className="text-[#9fcabd] text-sm p-5">No trips found.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[#9fcabd] text-xs text-left">
                <th className="px-5 py-3 font-medium">Date Time</th>
                <th className="px-5 py-3 font-medium">Route</th>
                <th className="px-5 py-3 font-medium">Driver</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Duration</th>
                <th className="px-5 py-3 font-medium">Avg speed</th>
              </tr>
            </thead>
            <tbody>
              {filteredTrips.map((trip) => (
                <tr key={trip.trip_id} className="border-t border-white/5">
                  <td className="px-5 py-3 text-[#eafff5]">{formatDateTime(trip.time_departed)}</td>
                  <td className="px-5 py-3 text-[#9fcabd]">Ormoc - {trip.route_label || "—"}</td>
                  <td className="px-5 py-3 text-[#9fcabd]">
                    {trip.driver ? `${trip.driver.first_name} ${trip.driver.last_name}` : "—"}
                  </td>
                  <td className="px-5 py-3">{statusBadge(trip.status)}</td>
                  <td className="px-5 py-3 text-[#9fcabd]">
                    {trip.trip_duration_minutes != null ? `${trip.trip_duration_minutes} min` : "—"}
                  </td>
                  <td className="px-5 py-3 text-[#9fcabd]">
                    {trip.average_speed_km != null ? `${trip.average_speed_km} km/h` : "—"}
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
    </main>
  );
}

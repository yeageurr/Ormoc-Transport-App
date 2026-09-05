import { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, ResponsiveContainer, Tooltip } from "recharts";
import StatCard from "../../components/ui/StatCard";
import { getDashboardStats, getTripVolume, getRecentIncidents } from "../../api/dashboardApi";

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [tripVolume, setTripVolume] = useState([]);
  const [recentIncidents, setRecentIncidents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadDashboardData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [statsData, volumeData, incidentsData] = await Promise.all([
          getDashboardStats(),
          getTripVolume(),
          getRecentIncidents(),
        ]);
        setStats(statsData);
        setTripVolume(volumeData);
        setRecentIncidents(incidentsData);
      } catch (err) {
        setError(err.message || "Failed to load dashboard data.");
      } finally {
        setIsLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  const totalTripVolume = tripVolume.reduce((sum, day) => sum + day.count, 0);

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-[#9fcabd] text-sm">Hello, Administrator!</p>
          <h1 className="text-[#eafff5] text-2xl font-bold">Dashboard</h1>
        </div>
        <p className="text-[#9fcabd] text-sm">{today}</p>
      </div>

      {error && (
        <div className="bg-[#3A1B14] text-[#D98B72] text-sm rounded-xl px-4 py-3 mb-6">
          {error}
        </div>
      )}

      {isLoading ? (
        <p className="text-[#9fcabd] text-sm">Loading dashboard...</p>
      ) : (
        <>
          <div className="grid grid-cols-4 gap-4 mb-6">
            <StatCard label="Total Trips Today" value={stats?.total_trips_today ?? "—"} icon="🚌" />
            <StatCard
              label="Avg Trip Duration"
              value={stats?.avg_trip_duration_minutes != null ? `${stats.avg_trip_duration_minutes}min.` : "—"}
              icon="🕐"
            />
            <StatCard
              label="Incidents Reported"
              value={stats?.incidents_reported_total ?? "—"}
              icon="⚠"
              iconColor="#F0997B"
            />
            <StatCard label="Drivers" value={stats?.drivers_total ?? "—"} icon="👤" />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2 bg-[#0a2420] rounded-2xl p-5">
              <div className="flex items-center justify-between mb-1">
                <h2 className="text-[#eafff5] text-base font-semibold">Trip Volume (last 7 days)</h2>
                <span className="text-[#9fcabd] text-xs">{totalTripVolume} Total</span>
              </div>
              <p className="text-[#5DCAA5] text-xs mb-4">
                Completed trips across all routes, with day-over-day trend
              </p>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={tripVolume}>
                  <XAxis
                    dataKey="day_label"
                    tick={{ fill: "#9fcabd", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{ background: "#0a2420", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }}
                    labelStyle={{ color: "#eafff5" }}
                    itemStyle={{ color: "#5DCAA5" }}
                  />
                  <Bar dataKey="count" fill="#1D9E75" radius={[4, 4, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-[#0a2420] rounded-2xl p-5">
              <h2 className="text-[#eafff5] text-base font-semibold mb-4">Recent Incidents</h2>
              <div className="space-y-4">
                {recentIncidents.length === 0 && (
                  <p className="text-[#9fcabd] text-sm">No incidents reported yet.</p>
                )}
                {recentIncidents.map((incident) => (
                  <div key={incident.incident_id} className="flex items-start justify-between">
                    <div>
                      <p className="text-[#eafff5] text-sm capitalize">
                        {incident.incident_type.replace(/_/g, " ")}
                      </p>
                      <p className="text-[#5DCAA5] text-xs">
                        Ormoc · {incident.route_label}
                      </p>
                    </div>
                    {incident.vehicle_plate && (
                      <span className="text-[#5DCAA5] text-xs">{incident.vehicle_plate}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
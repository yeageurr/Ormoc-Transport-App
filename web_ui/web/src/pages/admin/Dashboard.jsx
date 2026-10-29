import { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, ResponsiveContainer, Tooltip, LabelList } from "recharts";
import StatCard from "../../components/ui/StatCard";
import { getDashboardStats, getTripVolume } from "../../api/dashboardApi";
import { Bus, Clock, TrendingUp, TrendingDown, Minus, UserRoundCheck } from 'lucide-react';
import PageHeader from "../../components/ui/PageHeader";
import setTitle from "../../components/pageTitle";

function TrendIndicator({ current, previous, period }) {
  if (current == null || previous == null) {
    return (
      <span className="flex items-center gap-2 text-[#9fcabd]">
        <Minus className="w-3.5 h-3.5" />
      </span>
    );
  }

  if (previous === 0 && current > 0) {
    return (
      <span className="flex items-center gap-2 text-[#60FFE8]">
        <TrendingUp className="w-3.5 h-3.5" />
        <span>New {period}</span>
      </span>
    );
  }

  const changePercent = previous === 0 ? 0 : ((current - previous) / previous) * 100;
  const roundedChange = Math.round(changePercent * 10) / 10;
  const difference = current - previous;
  const TrendIcon = difference > 0 ? TrendingUp : difference < 0 ? TrendingDown : Minus;
  let changeLabel = '0%';
  if (difference !== 0) {
    changeLabel = roundedChange === 0
      ? `${difference > 0 ? '+' : '-'}<0.1%`
      : `${difference > 0 ? '+' : ''}${roundedChange}%`;
  }
  const directionColor = difference === 0 ? 'text-[#9fcabd]' : 'text-[#60FFE8]';

  return (
    <span className={`flex items-center gap-2 ${directionColor}`}>
      <TrendIcon className="w-3.5 h-3.5" />
      <span>{changeLabel} {period}</span>
    </span>
  );
}

export default function Dashboard() {
  setTitle('Dashboard');
  const [stats, setStats] = useState(null);
  const [tripVolume, setTripVolume] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadDashboardData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [statsData, volumeData] = await Promise.all([
          getDashboardStats(),
          getTripVolume(),
        ]);
        setStats(statsData);
        setTripVolume(volumeData);
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
      {/* Header */}
      <PageHeader title="Dashboard" />

      {error && (
        <div className="bg-[#3A1B14] text-[#D98B72] text-sm rounded-xl px-4 py-3 mb-6">
          {error}
        </div>
      )}

      {isLoading ? (
        <p className="text-[#9fcabd] text-sm">Loading dashboard...</p>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-4 mb-6">
            <StatCard 
              label="Total Trips Today" 
              value={stats?.total_trips_today ?? "—"} 
              icon={Bus} 
              subtext={<TrendIndicator current={stats?.total_trips_today} previous={stats?.total_trips_yesterday} period="vs yesterday" />}
            />
            <StatCard
              label="Avg Trip Duration (7 days)"
              value={stats?.avg_trip_duration_minutes != null ? `${stats.avg_trip_duration_minutes}min.` : "—"}
              icon={Clock}
              subtext={<TrendIndicator current={stats?.avg_trip_duration_minutes} previous={stats?.avg_trip_duration_previous_period_minutes} period="vs prior 7 days" />}
            />
            <StatCard 
              label="Drivers" 
              value={stats?.drivers_total ?? "—"} 
              icon={UserRoundCheck} 
              subtext={<TrendIndicator current={stats?.drivers_total} previous={stats?.drivers_total_previous_month} period="vs last month" />}
            />
          </div>

          <div className="grid grid-cols-1 gap-4">
            <div className="bg-[var(--wrapper-bg)] rounded-2xl p-5">
              <div className="flex items-center justify-between mb-1">
                <h2 className="text-[#eafff5] text-base font-semibold">Trip Volume (last 7 days)</h2>
                <span className="text-[#9fcabd] text-xs">{totalTripVolume} Total</span>
              </div>
              <p className="text-[#5DCAA5] text-xs mb-4">
                Completed trips across all routes, with day-over-day trend
              </p>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={tripVolume} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
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
                    cursor={{ fill: "rgba(29, 158, 117, 0.05)" }}
                  />
                  <Bar dataKey="count" fill="var(--chart-data-bg)" radius={[6, 6, 0, 0]} maxBarSize={45}>
                    <LabelList
                      dataKey="count"
                      position="top"
                      content={({ x, y, width, value }) => (
                        <g transform={`translate(${x + width / 2}, ${y - 8})`}>
                          {/* Little floating point/dot matching your prototype */}
                          <circle cx="0" cy="-4" r="3.5" fill="#5DCAA5" />
                          {/* Text label showing the count */}
                          <text
                            x="0"
                            y="-14"
                            fill="#eafff5"
                            textAnchor="middle"
                            fontSize="11"
                            fontWeight="600"
                          >
                            {value}
                          </text>
                        </g>
                      )}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

          </div>
        </>
      )}
    </>
  );
}

import { useState, useEffect } from "react";
import PageHeader from "../../components/ui/PageHeader";
import { Search, Eye, Loader2 } from "lucide-react";
import { fetchIncidents } from "../../api/incidentAPI";

export default function IncidentLogs() {
  const [incidents, setIncidents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Query database on component mount
  useEffect(() => {
    async function loadIncidents() {
      try {
        setIsLoading(true);
        setError(null);
        const data = await fetchIncidents();
        
        // Directly set whatever the database returns
        setIncidents(Array.isArray(data) ? data : data.incidents || []);
      } catch (err) {
        setError(err.message || "Failed to load incident logs from the server.");
      } finally {
        setIsLoading(false);
      }
    }

    loadIncidents();
  }, []);

  // Filter the live database records dynamically based on search query
  const filteredIncidents = incidents.filter((incident) => {
    const submittedBy = incident.submittedBy || incident.submitted_by || "";
    const type = incident.type || "";
    const route = incident.route || "";
    const dateTime = incident.dateTime || incident.date_time || "";

    return (
      submittedBy.toLowerCase().includes(searchQuery.toLowerCase()) ||
      type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      route.toLowerCase().includes(searchQuery.toLowerCase()) ||
      dateTime.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  return (
    <div>
      {/* Reusable Header */}
      <PageHeader title="Incident Logs" />

      {/* Search Bar */}
      <div className="flex items-center gap-3 mb-6">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9fcabd]" />
          <input
            type="text"
            placeholder="Search incident logs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#0a2420] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-[#eafff5] text-sm outline-none placeholder:text-[#9fcabd]/50 focus:border-[#1D9E75] transition-colors"
          />
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-[#0a2420] border border-white/10 rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-white/10 text-[#9fcabd] text-xs font-semibold">
          {isLoading ? "Loading incidents..." : `${filteredIncidents.length} incidents`}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 text-[#9fcabd] text-xs">
                <th className="py-3.5 px-6 font-medium">DATE & TIME</th>
                <th className="py-3.5 px-6 font-medium">SUBMITTED BY</th>
                <th className="py-3.5 px-6 font-medium">TYPE</th>
                <th className="py-3.5 px-6 font-medium">ROUTE</th>
                <th className="py-3.5 px-6 font-medium text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-sm text-[#eafff5]">
              {isLoading ? (
                <tr>
                  <td colSpan="5" className="py-12 text-center text-[#9fcabd]">
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="w-5 h-5 animate-spin text-[#1D9E75]" />
                      <span>Fetching database records...</span>
                    </div>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan="5" className="py-12 text-center text-[#D98B72] text-sm bg-[#3A1B14]/20">
                    {error}
                  </td>
                </tr>
              ) : filteredIncidents.length > 0 ? (
                filteredIncidents.map((incident) => (
                  <tr key={incident.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-4 px-6 text-[#eafff5]">{incident.dateTime || incident.date_time}</td>
                    <td className="py-4 px-6 text-[#eafff5]">{incident.submittedBy || incident.submitted_by}</td>
                    <td className="py-4 px-6 text-[#9fcabd]">{incident.type}</td>
                    <td className="py-4 px-6 text-[#9fcabd]">{incident.route}</td>
                    <td className="py-4 px-6 text-right">
                      <button 
                        onClick={() => alert(`Viewing incident details for ID: ${incident.id}`)}
                        className="inline-flex items-center gap-1.5 bg-[#1D9E75]/15 hover:bg-[#1D9E75]/25 text-[#5DCAA5] px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View</span>
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="py-8 text-center text-[#9fcabd] text-sm">
                    No incident records found in the database.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
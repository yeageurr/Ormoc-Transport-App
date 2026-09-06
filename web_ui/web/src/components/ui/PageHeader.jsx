import { RefreshCw, Calendar } from "lucide-react";

export default function PageHeader({ 
  title, 
  subtitle = "Hello, Administrator!", 
  onRefresh, 
  isRefreshing = false 
}) {
  const currentDate = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="flex items-center justify-between mb-6">
      {/* Left side: Subtitle and Title with optional Refresh */}
      <div>
        <p className="text-[#9fcabd] text-xs font-medium mb-1">{subtitle}</p>
        <div className="flex items-center gap-3">
          <h1 className="text-[#eafff5] text-2xl font-bold tracking-tight">{title}</h1>
          
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="text-[#9fcabd] hover:text-[#eafff5] transition-colors p-1 rounded-lg hover:bg-white/5"
              title="Refresh data"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
            </button>
          )}
        </div>
      </div>

      {/* Right side: Date Badge */}
      <div className="flex items-center gap-2 text-[#9fcabd] text-xs bg-white/5 border border-white/10 px-3.5 py-2 rounded-xl">
        <Calendar className="w-4 h-4 text-[#1D9E75]" />
        <span>{currentDate}</span>
      </div>
    </div>
  );
}
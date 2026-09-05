export default function StatCard({ label, value, icon, subtext, iconColor = "#5DCAA5" }) {
  return (
    <div className="bg-[#0a2420] rounded-2xl p-5 flex flex-col justify-between">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[#9fcabd] text-xs font-medium">{label}</span>
        <span className="text-lg" style={{ color: iconColor }}>{icon}</span>
      </div>
      <div>
        <div className="text-[#eafff5] text-2xl font-bold mb-1">{value}</div>
        {subtext && (
          <div className="text-[#5DCAA5] text-xs flex items-center gap-1">
            <span>{subtext}</span>
          </div>
        )}
      </div>
    </div>
  );
}
export default function StatCard({ label, value, icon, iconColor = "#5DCAA5" }) {
  return (
    <div className="bg-[#0a2420] rounded-2xl p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[#9fcabd] text-xs">{label}</span>
        <span style={{ color: iconColor }} className="text-base">
          {icon}
        </span>
      </div>
      <p className="text-[#eafff5] text-2xl font-bold">{value}</p>
    </div>
  );
}

export default function StatCard({ label, value, icon: Icon, subtext }) {
  return (
    <div className="bg-[var(--wrapper-bg)] rounded-2xl p-5 flex flex-col justify-between">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[#9fcabd] text-base font-medium">
          {label}
        </span>
        {Icon && (
          <div className="w-8 h-8 rounded-xl flex items-center justify-center">
            <Icon className="w-10 h-10 stroke-[#3ebdaa]" />
          </div>
        )}
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
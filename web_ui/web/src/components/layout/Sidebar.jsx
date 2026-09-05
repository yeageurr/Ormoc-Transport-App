import { NavLink } from "react-router-dom";
import { 
  LayoutDashboard, 
  Map, 
  Users, 
  Bus, 
  TriangleAlert, 
  ClipboardList, 
  NotepadText, 
  History,
  KeyRound,
  LogOut
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { BarChart, Bar, XAxis, ResponsiveContainer, Tooltip, LabelList } from "recharts";

const mainLinks = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/live-map", label: "Live Map", icon: Map },
  { to: "/users", label: "Users", icon: Users },
  { to: "/vehicles", label: "Vehicles", icon: Bus },
  { to: "/incidents", label: "Incident Logs", icon: TriangleAlert },
  { to: "/trips", label: "Trip Logs", icon: ClipboardList },
  { to: "/dispatch", label: "Dispatch Log", icon: NotepadText },
  { to: "/audit-logs", label: "Audit Logs", icon: History },
];

const accountLinks = [
  { to: "/change-password", label: "Change password", icon: KeyRound },
];

export default function Sidebar({ onOpenChangePassword }) {
  const { account, logout } = useAuth();

  return (
    <aside className="w-64 bg-[#05130f] border-r border-[#0d2e26] flex flex-col justify-between min-h-screen p-4 select-none">
      <div>
        {/* App Logo / Brand Header */}
        <div className="flex items-center gap-3 bg-[#0a2420] p-3.5 rounded-2xl mb-6 border border-[#113830]">
          <div className="w-10 h-10 rounded-xl bg-[#1D9E75] flex items-center justify-center text-white text-xl font-bold shadow-sm">
            🚌
          </div>
          <div>
            <h1 className="text-[#eafff5] text-sm font-bold tracking-tight">Ormoc Transport App</h1>
            <p className="text-[#9fcabd] text-[10px]">Admin Portal</p>
          </div>
        </div>

        {/* Main Navigation Group */}
        <div className="mb-6">
          <p className="text-[#9fcabd] text-[11px] font-semibold uppercase tracking-wider px-3 mb-2">
            Main
          </p>
          <nav className="space-y-1">
            {mainLinks.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-colors ${
                    isActive
                      ? "bg-[#113830] text-[#eafff5] font-semibold"
                      : "text-[#9fcabd] hover:bg-[#0a2420] hover:text-[#eafff5]"
                  }`
                }
              >
                <Icon className="w-4 h-4" />
                <span>{label}</span>
              </NavLink>
            ))}
          </nav>
        </div>

        {/* Account Settings Group */}
        <div>
          <p className="text-[#9fcabd] text-[11px] font-semibold uppercase tracking-wider px-3 mb-2">
            Account
          </p>
          <nav className="space-y-1">
            {/* {accountLinks.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-colors ${
                    isActive
                      ? "bg-[#113830] text-[#eafff5] font-semibold"
                      : "text-[#9fcabd] hover:bg-[#0a2420] hover:text-[#eafff5]"
                  }`
                }
              >
                <Icon className="w-4 h-4" />
                <span>{label}</span>
              </NavLink>
            ))} */}
            <button
              onClick={onOpenChangePassword}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium text-[#9fcabd] hover:bg-[#0a2420] hover:text-[#eafff5] transition-colors text-left"
            >
              <KeyRound className="w-4 h-4" />
              <span>Change password</span>
            </button>
          </nav>
        </div>
      </div>

      {/* User Footer Profile & Logout */}
      <div className="pt-4 border-t border-[#0d2e26]">
        <div className="flex items-center gap-3 px-3 mb-3">
          <div className="w-8 h-8 rounded-full bg-[#113830] flex items-center justify-center text-[#5DCAA5] font-bold text-xs">
            {account?.name ? account.name.charAt(0).toUpperCase() : "A"}
          </div>
          <div className="overflow-hidden">
            <p className="text-[#eafff5] text-xs font-semibold truncate">
              {account?.name || "Administrator"}
            </p>
            <p className="text-[#9fcabd] text-[10px] truncate">
              {account?.role ? account.role.replace(/_/g, " ") : "Terminal Administrator"}
            </p>
          </div>
        </div>

        <button
          onClick={logout}
          className="w-full flex items-center justify-center gap-2 bg-[#0a2420] hover:bg-[#113830] text-[#5DCAA5] hover:text-[#eafff5] py-2 rounded-xl text-xs font-medium transition-colors border border-[#113830]"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Log out</span>
        </button>
      </div>
    </aside>
  );
}
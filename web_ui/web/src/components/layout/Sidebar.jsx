import { useNavigate, NavLink } from "react-router-dom";
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
  LogOut,
  UserCircle
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";


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


export default function Sidebar({ onOpenChangePassword, onOpenLogout }) {
  const { account, logout } = useAuth();
  const navigate = useNavigate();
  const toHome = () =>  {
    navigate("/dashboard")
  }


  return (
    <aside className="w-[275px] h-full bg-[var(--wrapper-bg)] border-r border-[#0d2e26] flex flex-col justify-between min-h-screen p-4 select-none">
      <div>
        {/* App Logo / Brand Header */}
        <NavLink key={"/dashboard"} to={"/dashboard"} className="flex items-center gap-3 p-3.5 rounded-2xl mb-6">
          <div className="w-10 h-10 rounded-xl bg-[#1D9E75] flex items-center justify-center text-white text-xl font-bold shadow-sm">
            🚌
          </div>
          <div>
            <h1 className="text-[#eafff5] text-sm font-bold tracking-tight">Ormoc Transport App</h1>
            <p className="text-[#9fcabd] text-[10px]">Admin Portal</p>
          </div>
        </NavLink>

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
                  `flex items-center gap-3 px-3 py-2.5 rounded-r-[2px] text-[15px] font-regular transition-colors ${
                    isActive
                      ? "bg-[var(--button-active-bg)] text-[#eafff5] font-semibold border-l-[3px] border-[var(--labels)]"
                      : "text-[#9fcabd] hover:text-[#eafff5]"
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
            <button
              onClick={onOpenChangePassword}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[15px] font-regular text-[#9fcabd] hover:text-[#eafff5] transition-colors text-left"
            >
              <KeyRound className="w-4 h-4" />
              <span>Change password</span>
            </button>
          </nav>
        </div>
      </div>

      {/* User Footer Profile & Logout */}
      <div className="pt-4 border-t border-[#b0ffeb]">
        <div className="flex items-center gap-3 px-3 mb-3">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-[#5DCAA5] font-bold text-xs">
            <UserCircle />
          </div>
          <div className="overflow-hidden">
            <p className="text-[#eafff5] text-[15px] font-semibold truncate">
              {account?.name || "Administrator"}
            </p>
            <p className="text-[#9fcabd] text-[13px] font-medium truncate">
              {account?.role ? account.role.replace(/_/g, " ") : "Terminal Administrator"}
            </p>
          </div>
        </div>

        <button
          onClick={onOpenLogout}
          className="w-full flex items-center px-3 gap-2 bg-[#195E5A] text-[#5DCAA5] hover:text-[#eafff5] py-2 rounded-[5px] text-[15px] font-medium font-inter  transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Log out</span>
        </button>
      </div>
    </aside>
  );
}
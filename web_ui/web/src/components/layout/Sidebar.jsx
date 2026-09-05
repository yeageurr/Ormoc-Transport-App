import { NavLink } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const mainLinks = [
  { to: "/dashboard", label: "Dashboard", icon: "▦" },
  { to: "/live-map", label: "Live Map", icon: "🗺" },
  { to: "/users", label: "Users", icon: "👤" },
  { to: "/vehicles", label: "Vehicles", icon: "🚐" },
  { to: "/incidents", label: "Incident Logs", icon: "⚠" },
  { to: "/trips", label: "Trip Logs", icon: "📋" },
  { to: "/dispatch", label: "Dispatch Log", icon: "📄" },
  { to: "/audit-logs", label: "Audit Logs", icon: "🕐" },
];

export default function Sidebar({ onChangePassword }) {
  const { logout } = useAuth();

  return (
    <aside className="w-64 bg-[#0a2420] flex flex-col h-screen sticky top-0">
      <div className="flex flex-col items-center gap-3 py-8">
        <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center text-2xl">
          🙂
        </div>
        <h1 className="text-[#eafff5] text-base font-semibold text-center px-4">
          Ormoc Transport App
        </h1>
      </div>

      <nav className="flex-1 px-4 overflow-y-auto">
        <p className="text-[#5b7a70] text-xs font-medium px-3 mb-2 mt-2">Main</p>
        <ul className="space-y-1 mb-6">
          {mainLinks.map((link) => (
            <li key={link.to}>
              <NavLink
                to={link.to}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                    isActive
                      ? "bg-[#1D9E75] text-[#04342C] font-medium"
                      : "text-[#9fcabd] hover:bg-white/5"
                  }`
                }
              >
                <span className="text-base">{link.icon}</span>
                {link.label}
              </NavLink>
            </li>
          ))}
        </ul>

        <p className="text-[#5b7a70] text-xs font-medium px-3 mb-2">Account</p>
        <ul className="space-y-1">
          <li>
            <button
              onClick={onChangePassword}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-[#9fcabd] hover:bg-white/5 transition-colors text-left"
            >
              <span className="text-base">🔑</span>
              Change password
            </button>
          </li>
        </ul>
      </nav>

      <div className="p-4 border-t border-white/5">
        <div className="flex items-center gap-3 mb-3 px-1">
          <div className="w-9 h-9 rounded-full bg-[#1D9E75] flex items-center justify-center text-[#04342C] text-sm font-semibold">
            A
          </div>
          <div>
            <p className="text-[#eafff5] text-sm font-medium">Administrator</p>
            <p className="text-[#5DCAA5] text-xs">Terminal Administrator</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="w-full flex items-center gap-2 text-[#9fcabd] text-sm px-3 py-2 rounded-lg hover:bg-white/5 transition-colors"
        >
          <span>↪</span> Log out
        </button>
      </div>
    </aside>
  );
}

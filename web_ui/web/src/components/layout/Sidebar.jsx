import { NavLink } from "react-router-dom";
import {
  Users,
  History,
  LogOut,
  UserCircle
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import ormocDriverMark from "../../assets/ormoc-driver-mark.png";


const mainLinks = [
  { to: "/users", label: "Driver Accounts", icon: Users },
  { to: "/audit-logs", label: "Audit Trail", icon: History },
];

export default function Sidebar({ onOpenLogout }) {
  const { account } = useAuth();
  return (
    <aside className="flex h-full w-[264px] shrink-0 flex-col justify-between bg-[#A9E4FF] px-2.5 pb-2.5 pt-4 select-none max-[760px]:w-[72px]">
      <div>
        <NavLink to="/users" className="mx-0 mb-7 mt-4 flex h-24 items-center justify-center gap-3.5 rounded-lg">
          <img className="h-max w-[62px] object-contain max-[760px]:h-[52px] max-[760px]:w-[52px]" src={ormocDriverMark} alt="Ormoc City transport logo" />
          <div className="max-[760px]:hidden">
            <strong className="block text-[28px] leading-[1.05] text-[#091c26]">OTA</strong>
            <span className="mt-[5px] block text-sm text-[#0b2533]">Admin Portal</span>
          </div>
        </NavLink>

        <div className="mb-7">
          <p className="mb-2.5 px-2.5 text-[10px] font-semibold tracking-[.11em] text-[#365d6c] max-[760px]:hidden">
            ACCOUNT MANAGEMENT
          </p>
          <nav aria-label="Main navigation" className="flex flex-col gap-1">
            {mainLinks.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `flex min-h-[43px] items-center gap-[11px] rounded-md px-[11px] text-left text-sm transition-colors max-[760px]:w-[52px] max-[760px]:justify-center max-[760px]:overflow-hidden max-[760px]:px-0 max-[760px]:text-[0px] ${
                    isActive
                      ? "bg-[#00AEFF]/25 font-medium text-[#0070E8]"
                      : "bg-transparent font-normal text-[#234758] hover:bg-white/35"
                  }`
                }
              >
                <Icon className="h-[21px] w-[21px] shrink-0" />
                <span>{label}</span>
              </NavLink>
            ))}
          </nav>
        </div>

      </div>

      {/* User Footer Profile & Logout */}
      <div className="mt-auto w-full border-t border-[#6db4cf] px-[9px] pt-3 max-[760px]:px-0">
        <div className="mb-[15px] flex items-center gap-[10px] max-[760px]:justify-center">
          <div className="grid h-[31px] w-[31px] shrink-0 place-items-center rounded-full bg-[#a6e3fa] text-[#0879ac]">
            <UserCircle />
          </div>
          <div className="overflow-hidden max-[760px]:hidden">
            <p className="truncate text-xs font-semibold text-[#071e27]">
              {account?.display_name || account?.name || "Admin"}
            </p>
            <p className="truncate text-[10px] text-[#3e6370]">
              Administrator
            </p>
          </div>
        </div>

        <button
          onClick={onOpenLogout}
          className="h-[34px] w-full cursor-pointer rounded-md border-0 bg-white text-xs font-semibold text-[#142a34] transition-colors hover:bg-[#f3faff] max-[760px]:hidden"
        >
          <LogOut className="mr-2 inline h-3.5 w-3.5" />
          <span>Log out</span>
        </button>
      </div>
    </aside>
  );
}

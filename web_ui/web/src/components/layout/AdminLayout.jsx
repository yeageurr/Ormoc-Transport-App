import { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import ChangePasswordModal from "../modals/ChangePasswordModal";
import LogoutModal from "../modals/LogoutModal";
import { useAuth } from "../../context/AuthContext";
import { CalendarDays } from "lucide-react";

const today = () => new Intl.DateTimeFormat("en-US", {
  timeZone: "Asia/Manila", month: "long", day: "numeric", year: "numeric",
}).format(new Date());

export default function AdminLayout() {
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const { mustChangePassword, setMustChangePassword, logout } = useAuth();

  return (
    <div className="box-border flex h-screen gap-2.5 overflow-hidden bg-[#A9E4FF] p-2.5 text-[#18364a]">
      <Sidebar onOpenLogout={() => setIsLogoutModalOpen(true)} />
      <main className="flex h-full min-h-0 min-w-0 flex-1 flex-col gap-1 rounded-lg bg-[#A9E4FF]">
        <header className="flex min-h-[47px] shrink-0 items-center justify-between rounded-lg border-b border-[#b3d7e6] bg-[#f3faff] px-3">
          <strong className="truncate text-[13px] font-semibold">Ticketing Officer</strong>
          <span className="inline-flex items-center gap-[5px] rounded-[7px] bg-[#a6e3fa] px-[10px] py-[5px] text-[11px] text-[#183b4c]"><CalendarDays size={14} />{today()}</span>
        </header>
        <section className="box-border flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg bg-[#f5fbff] p-[15px] max-[760px]:p-2">
          <Outlet />
        </section>
      </main>

      <ChangePasswordModal
        isOpen={mustChangePassword}
        isRequired
        onClose={() => {}}
        onSuccess={() => setMustChangePassword(false)}
      />

      <LogoutModal
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
        onConfirm={logout}
      />
    </div>
  );
}

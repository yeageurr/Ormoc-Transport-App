import { useEffect, useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";

export default function Toast({ toast, onDismiss }) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!toast) return undefined;
    const frame = requestAnimationFrame(() => setIsVisible(true));
    const hideTimer = setTimeout(() => setIsVisible(false), 3000);
    const dismissTimer = setTimeout(onDismiss, 3300);
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(hideTimer);
      clearTimeout(dismissTimer);
    };
  }, [toast, onDismiss]);

  if (!toast) return null;
  const isSuccess = toast.type === "success";
  const Icon = isSuccess ? CheckCircle2 : XCircle;

  return (
    <div role="status" className={`fixed top-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-xl px-4 py-3 text-sm shadow-lg transition-all duration-300 ease-in-out ${isVisible ? "translate-y-0 opacity-100" : "-translate-y-16 opacity-0"} ${isSuccess ? "bg-[#0F6E56] text-[#D5FFF1]" : "bg-[#3A1B14] text-[#D98B72]"}`}>
      <Icon className="h-4 w-4 shrink-0" />
      <span>{toast.message}</span>
    </div>
  );
}

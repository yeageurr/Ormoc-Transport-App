import { Search } from "lucide-react";

export const adminFilterClassName = "h-11 bg-transparent border border-[var(--stroke-color)] rounded-[var(--input-radius)] px-4 text-[13px] text-[#9fcabd] outline-none focus:border-[var(--stroke-color-focus)] transition-colors";
export const adminCreateButtonClassName = "ml-auto h-11 bg-[var(--button-bg)] text-[#000] font-inter font-medium rounded-[var(--corner-radius-btn)] px-5 text-[13px] transition-colors hover:bg-[#40C2D6]";

export function AdminSearchField({ value, onChange, placeholder, className = "" }) {
  return (
    <div className={`relative h-11 w-60 shrink-0 ${className}`}>
      <Search size={16} stroke="var(--placeholder-fg)" className="absolute top-1/2 left-5 -translate-x-1/2 -translate-y-1/2" />
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className="h-full w-full rounded-[var(--input-radius)] border border-[var(--stroke-color)] bg-transparent px-10 text-[13px] text-[#fff] outline-none transition-colors placeholder:text-[13px] placeholder:font-inter placeholder:font-light placeholder:text-[var(--placeholder-fg)] focus:border-[var(--stroke-color-focus)]"
      />
    </div>
  );
}

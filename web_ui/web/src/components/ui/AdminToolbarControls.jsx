import { Search } from "lucide-react";

export const adminFilterClassName = "h-[35px] rounded-lg border border-[#becbd1] bg-white px-3 text-[12px] text-[#243d48] outline-none transition-colors focus:border-[#168dff]";
export const adminCreateButtonClassName = "ml-auto inline-flex h-[35px] cursor-pointer items-center rounded-md border-0 bg-[#168dff] px-4 text-[12px] font-semibold text-white transition-colors hover:bg-[#0876db]";

export function AdminSearchField({ value, onChange, placeholder, className = "" }) {
  return (
    <div className={`relative h-[35px] w-[186px] shrink-0 ${className}`}>
      <Search size={15} stroke="#52636b" className="absolute left-3 top-1/2 -translate-y-1/2" />
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className="h-full w-full rounded-lg border border-[#becbd1] bg-white pl-9 pr-3 text-[12px] text-[#243d48] outline-none transition-colors placeholder:text-[#52636b] focus:border-[#168dff]"
      />
    </div>
  );
}

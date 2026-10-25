import ormocDriverMark from '../../assets/ormoc-driver-mark.png';

export default function Navbar({ account, onLogout, activePage, items = [], onNavigate }) {
  const officerName = account?.display_name || [account?.first_name, account?.last_name].filter(Boolean).join(' ') || account?.username || 'Ticketing Officer';

  return (
    <aside className="flex h-full w-66 flex-col justify-between bg-[#A9E4FF] pt-4.5 pb-2.5">
      <div className="mb-7.5 mt-4.5 mx-2.5 flex align-center justify-center h-24 gap-3.5">
        <img className="h-max w-[62px] object-contain max-[760px]:h-[52px] max-[760px]:w-[52px]" src={ormocDriverMark} alt="Ormoc City transport logo" />
        <div className="max-[760px]:hidden"><strong className="block text-[28px] leading-[1.05] text-[#091c26]">OTA</strong><span className="mt-[5px] block text-sm text-[#0b2533]">Ticketing Portal</span></div>
      </div>
      {items.length > 0 && <>
        <p className="mb-2.5 text-[10px] font-semibold tracking-[.11em] text-[#365d6c] max-[760px]:hidden">OPERATIONS</p>
        <nav aria-label="Main navigation" className="flex flex-col gap-1">
          {items.map((item) => {
            const active = activePage === item.id;
            return <button
              key={item.id}
              type="button"
              aria-current={active ? 'page' : undefined}
              onClick={() => onNavigate?.(item.id)}
              className={`flex min-h-[43px] cursor-pointer items-center gap-[11px] rounded-md px-[11px] text-left text-sm transition-colors max-[760px]:w-[52px] max-[760px]:justify-center max-[760px]:overflow-hidden max-[760px]:px-0 max-[760px]:text-[0px] ${active ? "bg-[#00AEFF]/25 font-medium text-[#0070E8]" : 'bg-transparent font-normal text-[#234758] hover:bg-white/35'}`}
            >
              {item.icon || (item.id === 'users' ? <UsersIcon /> : item.id === 'history' ? <HistoryIcon /> : item.id === 'dispatch-history' ? <DispatchRecordsIcon /> : <DispatchIcon />)}{item.label}
            </button>;
          })}
        </nav>
      </>}
      <div className="mt-auto w-full border-t border-[#6db4cf] px-[9px] pt-3 max-[760px]:px-0">
        <div className="mb-[15px] flex items-center gap-[10px] max-[760px]:justify-center">
          <span className="grid h-[31px] w-[31px] place-items-center rounded-full bg-[#087e55] text-[#8fffc3]"><PersonIcon /></span>
          <span className="max-[760px]:hidden"><strong className="block text-xs text-[#071e27]">{officerName}</strong><small className="block text-[10px] text-[#3e6370]">Ticketing Officer</small></span>
        </div>
        <button className="h-[34px] w-full cursor-pointer rounded-md border-0 bg-white text-xs font-semibold text-[#142a34] max-[760px]:hidden" onClick={onLogout}>Log out</button>
      </div>
    </aside>
  );
}

function DispatchIcon() {
  return <svg className="h-[21px] w-[21px] shrink-0" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 8.3a3.7 3.7 0 1 0 0 7.4 3.7 3.7 0 0 0 0-7.4Z" stroke="currentColor" strokeWidth="1"/><path d="m19.4 13.5 1.1.8-1.4 2.5-1.3-.5a7.8 7.8 0 0 1-1.5.9l-.2 1.4h-2.9l-.3-1.4a7.7 7.7 0 0 1-1.6-.7l-1.2.7-1.7-2.3 1-1a7.6 7.6 0 0 1-.2-1.8l-1.2-.7 1.1-2.7 1.4.3a7.7 7.7 0 0 1 1.4-1.1l.1-1.4 2.8-.3.4 1.3a7.8 7.8 0 0 1 1.7.6l1.1-.8 1.9 2.2-.9 1.1c.3.6.4 1.2.4 1.8Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/></svg>;
}

function UsersIcon() {
  return <svg className="h-[21px] w-[21px] shrink-0" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="9" cy="8" r="3" stroke="currentColor" strokeWidth="1.5"/><path d="M3.5 19c.4-3 2.2-4.5 5.5-4.5 1.1 0 2 .2 2.8.6M16 11a3 3 0 1 0 0-6m1.5 9c2.1.6 3.2 2.2 3.5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>;
}

function HistoryIcon() {
  return <svg className="h-[21px] w-[21px] shrink-0" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 12a8 8 0 1 0 2.3-5.6L4 8.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><path d="M4 4.5v4h4M12 7.5v4.8l3.2 1.8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}

function DispatchRecordsIcon() {
  return <svg className="h-[21px] w-[21px] shrink-0" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M7 3.8h7l4 4v12.4H7a2 2 0 0 1-2-2V5.8a2 2 0 0 1 2-2Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/><path d="M14 4v4h4M8.5 12h7M8.5 15.5h7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>;
}

function PersonIcon() {
  return <svg className="h-[21px] w-[21px]" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="8" r="3.2" stroke="currentColor" strokeWidth="1.5"/><path d="M5.5 19c.8-3.2 3-4.8 6.5-4.8s5.7 1.6 6.5 4.8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>;
}

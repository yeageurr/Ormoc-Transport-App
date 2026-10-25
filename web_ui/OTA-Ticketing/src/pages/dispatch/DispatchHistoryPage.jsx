import { useEffect, useMemo, useRef, useState } from 'react';
import Navbar from '../../components/layout/Navbar';
import setTitle from '../../components/pageTitle';
import { listDispatchHistory, listDispatchRecordDates } from '../../api/dispatch.api';
import { listDispatcherAssignments } from '../../api/dispatcherAssignments.api';
import { verifyCurrentPassword } from '../../api/auth.api';
import { useAuth } from '../../context/AuthContext';
import EmptyTableState from '../../components/ui/EmptyTableState';

const PH = 'Asia/Manila';
const todayInPH = () => new Intl.DateTimeFormat('en-CA', { timeZone: PH, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
const dateLabel = (value) => value ? new Intl.DateTimeFormat('en-US', { timeZone: PH, weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).format(new Date(`${value}T12:00:00+08:00`)) : 'Unknown date';
const formatTime = (value) => value ? new Intl.DateTimeFormat('en-GB', { timeZone: PH, hour: '2-digit', minute: '2-digit' }).format(new Date(value)) : '—';
const formatDateTime = (value) => value ? new Intl.DateTimeFormat('en-GB', { timeZone: PH, day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value)) : '—';
const NAV_ITEMS = [
  { id: 'dispatch', label: 'Dispatch Operations' },
  { id: 'users', label: 'Users' },
  { id: 'dispatch-history', label: 'Dispatch Records' },
  { id: 'history', label: 'Audit History' },
];

export default function DispatchHistoryPage() {
  setTitle('Dispatch Record History');
  const { account, signOut } = useAuth();
  const [report, setReport] = useState(null);
  const [ticketDetail, setTicketDetail] = useState(null);
  const [dateRecords, setDateRecords] = useState([]);
  const [activeRouteCount, setActiveRouteCount] = useState(0);
  const [selected, setSelected] = useState(null);
  const [dateFilter, setDateFilter] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionRequest, setActionRequest] = useState(null);
  const actionType = actionRequest?.type || '';
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [dontAskAgain, setDontAskAgain] = useState(false);
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState('');
  const printWindow = useRef(null);
  const navigate = (page) => { window.location.hash = `#${page}`; };

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    Promise.all([listDispatchRecordDates(), listDispatcherAssignments(todayInPH())])
      .then(([dates, assignments]) => {
        if (!mounted) return;
        setDateRecords(dates);
        setActiveRouteCount(assignments.filter((assignment) => !assignment.closed_at).length);
      })
      .catch((requestError) => {
        if (!mounted) return;
        setError(requestError.message || 'Could not load dispatch records.');
      })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);

  const filteredDateRecords = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return dateRecords.filter((row) => (!dateFilter || row.operating_date === dateFilter) && (!needle || row.operating_date.includes(needle)));
  }, [dateRecords, dateFilter, search]);
  const routes = report?.routes || [];

  function requestAction(type, selectedRoutes = routes) {
    setActionRequest({ type, routes: selectedRoutes });
    setAuthError('');
    setConfirmOpen(true);
  }

  function exportAuthSessionKey() {
    const accountId = account?.account_id ?? account?.id ?? account?.username;
    return accountId ? `ota-export-auth:${accountId}` : null;
  }

  function confirmExportAction() {
    const key = exportAuthSessionKey();
    let alreadyVerified = false;
    try { alreadyVerified = Boolean(key && sessionStorage.getItem(key) === 'verified'); } catch { /* Keep password verification enabled if session storage is unavailable. */ }
    setConfirmOpen(false);
    if (alreadyVerified) void authorizeAndRun(true);
    else setAuthOpen(true);
  }

  async function authorizeAndRun(skipVerification = false) {
    if (actionType === 'Print') printWindow.current = window.open('', '_blank');
    setAuthBusy(true);
    setAuthError('');
    try {
      if (!skipVerification) {
        await verifyCurrentPassword(password);
        if (dontAskAgain) {
          const key = exportAuthSessionKey();
          try { if (key) sessionStorage.setItem(key, 'verified'); } catch { /* A failed preference write only means the next action asks again. */ }
        }
      }
      setAuthOpen(false);
      setConfirmOpen(false);
      setPassword('');
      const subCollectorName = account?.display_name || account?.username || '—';
      const exportRoutes = actionRequest?.routes || routes;
      if (actionType === 'PDF') downloadPdf(exportRoutes, report?.operating_date, subCollectorName);
      else if (actionType === 'Excel spreadsheet') downloadExcel(exportRoutes, report?.operating_date, subCollectorName);
      else if (actionType === 'Print') {
        const target = printWindow.current;
        if (!target || target.closed) throw new Error('The print window was blocked. Allow pop-ups and try again.');
        target.document.open();
        target.document.write(printMarkup(exportRoutes, report?.operating_date, subCollectorName));
        target.document.close();
        target.focus();
        window.setTimeout(() => target.print(), 250);
      }
      setActionRequest(null);
    } catch (requestError) {
      if (printWindow.current && !printWindow.current.closed) printWindow.current.close();
      printWindow.current = null;
      setAuthOpen(true);
      setAuthError(requestError.message || 'Could not verify your password.');
    } finally {
      setAuthBusy(false);
    }
  }

  const reportTitle = dateLabel(report?.operating_date || dateFilter || todayInPH());
  return <div className="box-border flex h-screen flex-row gap-2.5 overflow-hidden bg-[#A9E4FF] p-2.5 text-[#18364a]">
    <Navbar account={account} items={NAV_ITEMS} activePage="dispatch-history" onNavigate={navigate} onLogout={() => void signOut()} />
    <main className="box-border flex h-full min-h-0 min-w-0 flex-1 flex-col gap-1 overflow-hidden rounded-lg bg-[#A9E4FF]">
      <header className="flex min-h-[47px] items-center justify-between rounded-lg border-b border-[#b3d7e6] bg-[#f3faff] px-3"><strong className="text-[13px] font-semibold">Ticketing Officer</strong><span className="rounded-[7px] bg-[#a6e3fa] px-[10px] py-[5px] text-[11px]">{new Intl.DateTimeFormat('en-US', { timeZone: PH, month: 'long', day: 'numeric', year: 'numeric' }).format(new Date())}</span></header>
      <section className="box-border flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg bg-[#f5fbff] p-[15px] max-[760px]:p-2">
        <section className="flex min-h-20 shrink-0 items-center justify-between gap-4 rounded-[11px] border border-[#168dff] bg-white px-[26px] py-[11px] max-[600px]:px-3">
          <div><small className="block text-[9px] text-[#466475]">Today, {new Intl.DateTimeFormat('en-US', { timeZone: PH, weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' }).format(new Date())}</small><strong className="mt-[3px] block text-[25px] font-semibold leading-[1.05] text-[#27495b]">{new Intl.DateTimeFormat('en-GB', { timeZone: PH, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date())}</strong><span className="mt-1 block text-[9px] text-[#486272]">Daily ticket departures and route operation times.</span></div>
          <div className="flex items-center gap-[34px] max-[600px]:flex-col max-[600px]:items-end max-[600px]:gap-2"><strong className="whitespace-nowrap text-sm text-[#008b43] max-[600px]:text-xs">{activeRouteCount} Routes Active</strong><button className="rounded-md border-0 bg-[#168dff] px-4 py-2 text-xs font-semibold text-white hover:bg-[#0876db]" onClick={() => navigate('dispatch')}>View Dispatch Operations</button></div>
        </section>
        <div className="mb-3 mt-8 flex shrink-0 flex-wrap items-center justify-between gap-3 px-[5px] max-[760px]:mt-5"><h1 className="m-0 text-[22px] font-bold text-[#244659]">Dispatch Records</h1><div className="flex flex-wrap gap-2"><label className="flex h-[35px] items-center gap-2 rounded-lg border border-[#becbd1] bg-white px-3 text-[11px]"><CalendarIcon /><input className="bg-transparent outline-none" type="date" aria-label="Select dispatch record date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} /></label><label className="flex h-[35px] w-[186px] items-center gap-2 rounded-lg border border-[#becbd1] bg-white px-3"><SearchIcon /><input className="w-full bg-transparent text-[11px] outline-none" placeholder="Search tickets..." aria-label="Search dispatch tickets" value={search} onChange={(e) => setSearch(e.target.value)} /></label></div></div>
        {error && <div role="alert" className="mb-2 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">{error}</div>}
        <div className="min-h-0 flex-1 overflow-auto rounded-[5px] border border-[#a8d5e8] bg-white px-[10px] py-[7px]"><table className={`${!loading && !filteredDateRecords.length ? 'h-full' : ''} w-full min-w-[620px] border-collapse text-left text-[11px] text-[#29485a]`}><thead className="sticky top-0 z-10 bg-white"><tr><th className="w-[8%] border-b border-[#9daeb7] px-[9px] py-[10px]" aria-label="Full view"></th>{['Date of Dispatch', 'Opened At', 'Closed At', 'Tickets Issued'].map((heading) => <th key={heading} className="border-b border-[#9daeb7] px-[9px] py-[10px] text-center font-semibold">{heading}</th>)}</tr></thead><tbody className={!loading && !filteredDateRecords.length ? 'h-full' : ''}>
          {filteredDateRecords.map((row) => <tr className="h-[48px] border-b border-[#9daeb7] last:border-0" key={row.operating_date}><td className="px-[9px] py-0"><button className="grid h-7 w-7 cursor-pointer place-items-center rounded text-[#345365] hover:bg-[#eaf7fc]" onClick={async () => { setLoading(true); try { const data = await listDispatchHistory(row.operating_date); setReport(data); setSelected(row); } catch (requestError) { setError(requestError.message || 'Could not load the daily dispatch record.'); } finally { setLoading(false); } }} aria-label={`View dispatch record for ${row.operating_date}`} title="View full daily record"><ExpandIcon /></button></td><td className="px-[9px] py-0 text-center">{dateLabel(row.operating_date)}</td><td className="px-[9px] py-0 text-center">{formatTime(row.opened_at)}</td><td className="px-[9px] py-0 text-center">{formatTime(row.closed_at)}</td><td className="px-[9px] py-0 text-center">{row.total_tickets}</td></tr>)}
          {!loading && !filteredDateRecords.length && <tr className="h-full"><td className="h-full" colSpan="5"><EmptyTableState fill /></td></tr>}{loading && <tr><td colSpan="5" className="h-28 text-center text-[#718792]">Loading dispatch records…</td></tr>}
        </tbody></table></div>
      </section>
    </main>
    {selected && report && <DailyReportModal report={report} onClose={() => { setSelected(null); setReport(null); }} onTicketSelect={(ticket, route) => setTicketDetail({ ...ticket, route_opened_at: route.opened_at, route_closed_at: route.closed_at })} onAction={requestAction} />}
    {ticketDetail && <TicketDetailsModal ticket={ticketDetail} onClose={() => setTicketDetail(null)} />}
    {confirmOpen && <div className="fixed inset-0 z-[60] grid place-items-center bg-[#0c1f2a]/45 p-4"><section className="w-full max-w-[430px] rounded-xl bg-white p-6 shadow-xl"><p className="m-0 text-[10px] font-bold tracking-[.1em] text-[#0879ac]">CONFIRM {actionType.toUpperCase()}</p><h2 className="mb-2 mt-2 text-xl font-bold text-[#173b4e]">{actionType === 'Print' ? 'Print dispatch masterlist?' : 'Export dispatch masterlist?'}</h2><p className="text-sm leading-relaxed text-[#536c78]">{actionType === 'Print' ? <>Print the dispatch masterlist for <strong>{reportTitle}</strong>?</> : <>Export dispatch masterlist on <strong>{reportTitle}</strong> to <strong>{actionType}</strong>?</>}</p><div className="mt-6 flex justify-end gap-2"><button className="rounded-md bg-[#edf4f7] px-4 py-2 text-xs font-semibold text-[#34515f]" onClick={() => { setConfirmOpen(false); setActionRequest(null); }}>Cancel</button><button className="rounded-md bg-[#168dff] px-4 py-2 text-xs font-semibold text-white" onClick={confirmExportAction}>Confirm</button></div></section></div>}
    {authOpen && <div className="fixed inset-0 z-[70] grid place-items-center bg-[#0c1f2a]/45 p-4"><form className="relative w-full max-w-[420px] rounded-xl border border-[#d4e4eb] bg-white p-7 shadow-[0_18px_55px_rgba(10,44,63,0.2)]" onSubmit={(e) => { e.preventDefault(); void authorizeAndRun(); }}>
      <button type="button" className="absolute right-4 top-3 grid h-8 w-8 place-items-center rounded-full border-0 bg-transparent text-2xl text-[#506b77]" aria-label="Close authorization" onClick={() => { setAuthOpen(false); setPassword(''); if (printWindow.current && !printWindow.current.closed) printWindow.current.close(); }}>×</button>
      <span className="text-[10px] font-bold tracking-[.1em] text-[#0879ac]">AUTHORIZATION REQUIRED</span><h2 className="mb-1 mt-2 text-[22px] font-bold text-[#173b4e]">Verify your identity</h2><p className="mb-5 text-[13px] text-[#536c78]">Enter your password for verification.</p>
      <label className="mb-2 block text-xs font-semibold text-[#294a5b]" htmlFor="history-export-password">Password</label><input id="history-export-password" autoFocus type="password" autoComplete="current-password" placeholder="password here..." className="h-[42px] w-full rounded-md border border-[#acc4ce] px-3 text-sm outline-none focus:border-[#168dff]" value={password} onChange={(e) => setPassword(e.target.value)} required />
      <label className="mt-3 flex cursor-pointer items-center gap-2 text-xs text-[#536c78]"><input type="checkbox" className="h-4 w-4 accent-[#168dff]" checked={dontAskAgain} onChange={(e) => setDontAskAgain(e.target.checked)} />Don't ask again in this session</label>
      {authError && <p role="alert" className="mb-0 mt-2 text-xs text-rose-700">{authError}</p>}
      <div className="mt-6 flex justify-end gap-2"><button type="button" className="rounded-md bg-[#edf4f7] px-4 py-2 text-xs font-semibold text-[#34515f]" onClick={() => { setAuthOpen(false); setPassword(''); if (printWindow.current && !printWindow.current.closed) printWindow.current.close(); }}>Close</button><button type="submit" disabled={authBusy || !password} className="rounded-md bg-[#168dff] px-4 py-2 text-xs font-semibold text-white disabled:opacity-50">{authBusy ? 'Verifying…' : 'Continue'}</button></div>
    </form></div>}
  </div>;
}

function DailyReportModal({ report, onClose, onTicketSelect, onAction }) {
  const [activeRouteId, setActiveRouteId] = useState(report.routes.find((route) => route.route_name.toLowerCase() === 'valencia')?.route_id ?? report.routes[0]?.route_id ?? null);
  const [openExportMenu, setOpenExportMenu] = useState(null);
  const activeRoute = report.routes.find((route) => route.route_id === activeRouteId) || report.routes[0];
  const buttonClass = 'inline-flex h-[34px] items-center gap-2 rounded-md border-0 bg-[#078ff0] px-3 text-xs font-semibold text-white hover:bg-[#0876db]';

  function chooseExport(format) {
    onAction(format, report.routes);
    setOpenExportMenu(null);
  }

  return <div className="fixed inset-0 z-50 grid place-items-center bg-[#0c1f2a]/55 p-4" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}><section className="relative flex h-[min(92vh,720px)] max-h-[calc(100vh-2rem)] w-full max-w-[1024px] flex-col overflow-hidden rounded-xl border border-[#d4e4eb] bg-[#f5fbff] shadow-[0_18px_55px_rgba(10,44,63,0.2)]" role="dialog" aria-modal="true" aria-labelledby="daily-report-title">
    <button type="button" className="absolute right-3 top-2 z-10 grid h-8 w-8 cursor-pointer place-items-center rounded-full border-0 bg-transparent text-2xl text-[#506b77] hover:bg-[#e8f4fa]" aria-label="Close record" onClick={onClose}>×</button>
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-[15px] pb-5 pt-[18px] max-[600px]:px-3">
      <div className="shrink-0 text-[#29485a]"><h2 id="daily-report-title" className="mb-1 mt-0 text-[22px] font-bold">Dispatch Records</h2><p className="m-0 text-[10px]">Date: {dateLabel(report.operating_date)}</p><p className="m-0 text-[10px]">Ormoc City Terminal 2, Ticketing Booth</p></div>
      <nav aria-label="Dispatch route reports" className="mt-[18px] flex shrink-0 flex-wrap gap-[3px]">
        {report.routes.map((route) => <button key={route.route_id} type="button" className={`cursor-pointer rounded-t-md border-0 px-[10px] py-[6px] text-[10px] ${activeRoute?.route_id === route.route_id ? 'bg-white text-[#244659] shadow-[0_-1px_3px_rgba(36,70,89,.12)]' : 'bg-[#dbeaf1] text-[#385b6d] hover:bg-[#cbe2ec]'}`} onClick={() => { setActiveRouteId(route.route_id); setOpenExportMenu(null); }}>{route.route_name}</button>)}
      </nav>
      {activeRoute ? <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-b-md rounded-tr-md border border-[#b8d6e4] bg-white px-[10px] pb-[10px] pt-2">
        <h3 className="mb-3 mt-1 shrink-0 text-center text-[21px] font-semibold text-[#27495b]">Dispatch Records for {activeRoute.route_name}</h3>
        <div className="flex shrink-0 justify-end pr-1 text-[9px] font-semibold italic text-[#27495b]">{activeRoute.tickets.length} Tickets Today</div>
        <div className="min-h-0 flex-1 overflow-y-auto">
        <table className="w-full border-collapse text-left text-[11px] text-[#29485a]"><thead className="sticky top-0 bg-white"><tr><th className="w-1/2 border-b border-[#9daeb7] px-3 py-[10px] text-center font-semibold">Vehicle Plate Number</th><th className="w-1/2 border-b border-[#9daeb7] px-3 py-[10px] text-center font-semibold">Time of Departure</th></tr></thead><tbody>
          {activeRoute.tickets.map((ticket) => <tr key={ticket.ticket_id} className="h-[35px] border-b border-[#d4e0e5] last:border-0"><td className="px-3 py-0"><button className="cursor-pointer border-0 bg-transparent p-0 text-left text-[#29485a] hover:underline" onClick={() => onTicketSelect(ticket, activeRoute)} title="View full dispatch ticket">{ticket.plate_number}</button></td><td className="px-3 py-0 text-center">{formatTime(ticket.departure_at)}</td></tr>)}
          {!activeRoute.tickets.length && <tr className="h-[54px]"><td colSpan="2" className="text-center text-xs text-[#758891]">No tickets issued for this route</td></tr>}
        </tbody></table>
        </div>
        <div className="mt-auto flex shrink-0 flex-wrap justify-end gap-[9px] pt-3">
          <div className="relative"><button type="button" className={buttonClass} aria-haspopup="menu" aria-expanded={openExportMenu === 'masterlist'} onClick={() => setOpenExportMenu((current) => current === 'masterlist' ? null : 'masterlist')}>Export Masterlist <LayersIcon /></button>{openExportMenu === 'masterlist' && <ExportMenu onSelect={chooseExport} />}</div>
          <button className="inline-flex h-[34px] items-center gap-2 rounded-md border-0 bg-[#a8e2f8] px-3 text-xs font-semibold text-[#163b50] hover:bg-[#8dd5f2]" onClick={() => onAction('Print', report.routes)}>Print <PrintIcon /></button>
        </div>
      </section> : <div className="mt-4 flex min-h-0 flex-1 items-center justify-center rounded-md border border-[#b8d6e4] bg-white p-10 text-center text-sm text-[#718792]">No route records for this date.</div>}
    </div>
  </section></div>;
}

function ExportMenu({ onSelect }) {
  return <div role="menu" className="absolute bottom-[calc(100%+9px)] right-0 z-20 w-[178px] rounded-md bg-[#193b4c] p-2 text-white shadow-lg"><p className="mb-2 mt-0 text-[11px]">Export as</p><div className="flex gap-2"><button role="menuitem" className="flex flex-1 items-center justify-center gap-1 rounded bg-[#d82929] px-2 py-1.5 text-[11px] font-semibold text-white hover:bg-[#bd2020]" onClick={() => onSelect('PDF')}>PDF <DocumentIcon /></button><button role="menuitem" className="flex flex-1 items-center justify-center gap-1 rounded bg-[#168447] px-2 py-1.5 text-[11px] font-semibold text-white hover:bg-[#116d39]" onClick={() => onSelect('Excel spreadsheet')}>Spreadsheet <GridIcon /></button></div><span className="absolute -bottom-[7px] right-5 h-0 w-0 border-x-[7px] border-t-[8px] border-x-transparent border-t-[#193b4c]" /></div>;
}

function TicketDetailsModal({ ticket, onClose }) {
  return <div className="fixed inset-0 z-50 grid place-items-center bg-[#0c1f2a]/45 p-4" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}><section className="relative max-h-[90vh] w-full max-w-[620px] overflow-y-auto rounded-xl border border-[#d4e4eb] bg-white p-6 shadow-[0_18px_55px_rgba(10,44,63,0.2)]" role="dialog" aria-modal="true" aria-labelledby="dispatch-detail-title">
    <button type="button" className="absolute right-4 top-3 grid h-8 w-8 cursor-pointer place-items-center rounded-full border-0 bg-transparent text-2xl text-[#506b77] hover:bg-[#edf6fa]" aria-label="Close record" onClick={onClose}>×</button><span className="text-[10px] font-bold tracking-[.1em] text-[#0879ac]">DISPATCH TICKET · {ticket.reference_number}</span><h2 id="dispatch-detail-title" className="mb-4 mt-1 pr-10 text-[23px] font-bold text-[#173b4e]">{ticket.route_name}</h2>
    <dl className="grid gap-0"><Detail label="Plate number" value={ticket.plate_number} /><Detail label="Driver" value={ticket.driver_name} /><Detail label="Driver contact" value={ticket.driver_contact} /><Detail label="Time of departure" value={formatDateTime(ticket.departure_at)} /><Detail label="Ticket issued at" value={formatDateTime(ticket.issued_at)} /><Detail label="Queue number" value={ticket.queue_number} /><Detail label="Route operation opened at" value={formatDateTime(ticket.route_opened_at)} /><Detail label="Route operation closed at" value={formatDateTime(ticket.route_closed_at)} /><Detail label="Operating date" value={dateLabel(ticket.operating_date)} /><Detail label="Ticket ID" value={ticket.ticket_id} /></dl>
  </section></div>;
}

const MASTERLIST_ROUTE_ORDER = ['Albuera', 'Sabang Bao', 'Puertobello', 'Valencia'];
const MASTERLIST_ROUTE_LANES = {
  albuera: { MULTICAB: 3, MINIBUS: 1 },
  'sabang bao': { MULTICAB: 1 },
  puertobello: { MULTICAB: 2 },
  valencia: { MULTICAB: 3 },
};
const localTime = (value) => new Intl.DateTimeFormat('en-GB', { timeZone: PH, hour: '2-digit', minute: '2-digit' }).format(value);

function makeMasterlist(routes) {
  const orderedRoutes = [...routes].sort((left, right) => {
    const leftIndex = MASTERLIST_ROUTE_ORDER.indexOf(left.route_name);
    const rightIndex = MASTERLIST_ROUTE_ORDER.indexOf(right.route_name);
    return (leftIndex < 0 ? Number.MAX_SAFE_INTEGER : leftIndex) - (rightIndex < 0 ? Number.MAX_SAFE_INTEGER : rightIndex) || left.route_name.localeCompare(right.route_name);
  });
  const routeGroups = orderedRoutes.map((route) => {
    const routeLayout = MASTERLIST_ROUTE_LANES[route.route_name.toLowerCase()] || { MULTICAB: 1, MINIBUS: 1 };
    const ticketsByType = new Map();
    route.tickets.forEach((ticket) => {
      const type = String(ticket.vehicle_type || 'MULTICAB').toUpperCase().includes('MINIBUS') ? 'MINIBUS' : 'MULTICAB';
      if (!ticketsByType.has(type)) ticketsByType.set(type, []);
      ticketsByType.get(type).push(ticket);
    });
    const vehicleGroups = Object.entries(routeLayout).map(([type, laneCount]) => {
      const lanes = Array.from({ length: laneCount }, () => ({ vehicle_type: type, tickets: [] }));
      const vehicles = new Map();
      (ticketsByType.get(type) || []).forEach((ticket) => {
        const plate = String(ticket.plate_number || '');
        if (!vehicles.has(plate)) vehicles.set(plate, []);
        vehicles.get(plate).push(ticket);
      });
      [...vehicles.entries()].sort(([plateA], [plateB]) => plateA.localeCompare(plateB)).forEach(([, vehicleTickets], vehicleIndex) => {
        const lane = lanes[vehicleIndex % laneCount];
        lane.tickets.push(...vehicleTickets);
      });
      lanes.forEach((lane) => lane.tickets.sort((a, b) => new Date(a.departure_at) - new Date(b.departure_at)));
      return { type, lanes };
    });
    const slots = vehicleGroups.flatMap((group) => group.lanes);
    return { ...route, vehicleGroups, slots };
  });
  const totalTickets = routeGroups.reduce((sum, route) => sum + route.tickets.length, 0);
  const rowCount = Math.max(35, ...routeGroups.flatMap((route) => route.slots.map((slot) => slot.tickets.length)));
  return { routeGroups, totalTickets, rowCount };
}

function makeMasterlistHtml(routes, date, subCollectorName) {
  const { routeGroups, totalTickets, rowCount } = makeMasterlist(routes);
  const routeHeaders = routeGroups.map((route) => `<th class="route" colspan="${route.slots.length * 2}">${escapeHtml(route.route_name)}</th>`).join('');
  const typeHeaders = routeGroups.map((route) => route.vehicleGroups.map((group) => `<th class="vehicle-type" colspan="${group.lanes.length * 2}">${escapeHtml(group.type)}</th>`).join('')).join('');
  const vehicleHeaders = routeGroups.flatMap((route) => route.slots.map(() => '<th>PLATE #</th><th>TIME</th>')).join('');
  const tripRows = Array.from({ length: rowCount }, (_, rowIndex) => `<tr><th class="row-number">${rowIndex + 1}</th>${routeGroups.flatMap((route) => route.slots.map((slot) => {
    const ticket = slot.tickets[rowIndex];
    return `<td>${ticket ? escapeHtml(ticket.plate_number) : ''}</td><td>${ticket ? escapeHtml(formatTime(ticket.departure_at)) : ''}</td>`;
  })).join('')}</tr>`).join('');
  const generatedTime = localTime(new Date());
  return `<!doctype html><html><head><meta charset="utf-8"><title>Dispatch masterlist ${escapeHtml(date)}</title><style>@page{size:landscape;margin:10mm}*{box-sizing:border-box}body{font:9px Arial,sans-serif;color:#111;margin:0}header{text-align:center;border:1px solid #222;border-bottom:0;padding:3px 0 2px}header h1{font-size:11px;margin:0;font-weight:600}header p{font-size:9px;margin:2px 0 0;font-weight:500}table{width:100%;border-collapse:collapse;table-layout:fixed}th,td{border:1px solid #222;padding:2px 1px;text-align:center;overflow:hidden;white-space:nowrap;font-weight:500}th{font-weight:600}.details td{border:0;text-align:left;height:15px;padding-left:4px;font-weight:600}.summary{margin:8px 0}.summary td{height:21px}.summary-item{padding:4px 8px}.routes .route{height:18px;font-size:10px}.vehicle-type{height:16px;font-size:9px}.routes .row-number{width:28px}.routes td{height:13px;font-size:8px}</style></head><body>
    <header><h1>Republic of the Philippines</h1><p>ORMOC CITY, LEYTE</p></header>
    <table class="details"><tbody><tr><td>Sub Collector Name: ${escapeHtml(subCollectorName || '—')}</td></tr><tr><td>DATE: ${escapeHtml(dateLabel(date))}</td></tr><tr><td>TIME: ${escapeHtml(generatedTime)}</td></tr></tbody></table>
    <table class="summary"><tbody><tr><td class="summary-item"><strong>TICKET</strong>&nbsp; ${totalTickets}</td><td class="summary-item"><strong>TRIPS</strong>&nbsp; ${totalTickets}</td><td class="summary-item"><strong>AMOUNT</strong>&nbsp;</td></tr></tbody></table>
    <table class="routes"><thead><tr><th rowspan="3" class="row-number">NO.</th>${routeHeaders}</tr><tr>${typeHeaders}</tr><tr>${vehicleHeaders}</tr></thead><tbody>${tripRows}</tbody></table>
  </body></html>`;
}

function downloadExcel(routes, date, subCollectorName) {
  const html = makeMasterlistHtml(routes, date, subCollectorName);
  const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8' });
  downloadBlob(blob, `dispatch-masterlist-${date}.xls`);
}

function downloadPdf(routes, date, subCollectorName) {
  const PAGE_WIDTH = 792;
  const PAGE_HEIGHT = 612;
  const LEFT = 24;
  const WIDTH = PAGE_WIDTH - LEFT * 2;
  const NUMBER_WIDTH = 24;
  const { routeGroups, totalTickets, rowCount } = makeMasterlist(routes);
  const slotCount = Math.max(1, routeGroups.reduce((sum, route) => sum + route.slots.length, 0));
  const pairWidth = (WIDTH - NUMBER_WIDTH) / (slotCount * 2);
  const ROWS_PER_PAGE = 35;
  const pageCount = Math.max(1, Math.ceil(rowCount / ROWS_PER_PAGE));
  const pages = [];

  for (let pageIndex = 0; pageIndex < pageCount; pageIndex += 1) {
    const commands = [];
    const addText = (value, x, baseline, size = 6, bold = false, centered = false, maxWidth = Infinity) => {
      const text = ascii(value).slice(0, Math.max(1, Math.floor(maxWidth / (size * 0.52))));
      const textWidth = text.length * size * 0.5;
      const drawX = centered ? x + Math.max(0, (maxWidth - textWidth) / 2) : x + 2;
      commands.push(`BT /${bold ? 'F2' : 'F1'} ${size} Tf 0 0 0 rg 1 0 0 1 ${drawX.toFixed(1)} ${baseline.toFixed(1)} Tm (${pdfEscape(text)}) Tj ET`);
    };
    const cell = (x, top, width, height, value = '', options = {}) => {
      const bottom = top - height;
      if (options.fill) commands.push(`${options.fill} rg ${x.toFixed(2)} ${bottom.toFixed(2)} ${width.toFixed(2)} ${height.toFixed(2)} re f`);
      commands.push('0.10 0.10 0.10 RG 0.45 w');
      commands.push(`${x.toFixed(2)} ${bottom.toFixed(2)} ${width.toFixed(2)} ${height.toFixed(2)} re S`);
      if (value) addText(value, x, bottom + (height - (options.fontSize || 5.5)) / 2 + 1, options.fontSize || 5.5, Boolean(options.bold), options.center !== false, width);
    };

    addText('Republic of the Philippines', LEFT, 582, 10, true, true, WIDTH);
    addText('ORMOC CITY, LEYTE', LEFT, 570, 8, false, true, WIDTH);
    addText('TERMINAL 2 (City Proper)', LEFT, 551, 11, true, true, WIDTH);
    addText(`Sub Collector Name: ${subCollectorName || '—'}`, LEFT, 535, 6.5, false, false, WIDTH);
    addText(`DATE: ${dateLabel(date)}`, LEFT, 522, 6.5, false, false, WIDTH);
    addText(`TIME: ${localTime(new Date())}`, LEFT, 509, 6.5, false, false, WIDTH);
    const summaryTop = 500;
    const summaryWidth = WIDTH / 3;
    [['TICKET', totalTickets], ['TRIPS', totalTickets], ['AMOUNT', '']].forEach(([label, value], index) => {
      cell(LEFT + index * summaryWidth, summaryTop, summaryWidth, 18, `${label}: ${value}`, { bold: true, fontSize: 7.5, fill: '0.98 0.98 0.98' });
    });

    const tableTop = 474;
    const routeWidth = slotCount * pairWidth * 2;
    cell(LEFT, tableTop, NUMBER_WIDTH, 40, 'NO.', { bold: true, fontSize: 5.5, fill: '0.96 0.96 0.96' });
    let x = LEFT + NUMBER_WIDTH;
    routeGroups.forEach((route) => {
      const groupWidth = route.slots.length * pairWidth * 2;
      cell(x, tableTop, groupWidth, 14, route.route_name.toUpperCase(), { bold: true, fontSize: 7.5, fill: '0.93 0.93 0.93' });
      x += groupWidth;
    });
    let fleetTop = tableTop - 14;
    x = LEFT + NUMBER_WIDTH;
    routeGroups.forEach((route) => {
      route.vehicleGroups.forEach((fleet) => {
        const groupWidth = fleet.lanes.length * pairWidth * 2;
        cell(x, fleetTop, groupWidth, 12, fleet.type, { bold: true, fontSize: 6.5, fill: '0.97 0.97 0.97' });
        x += groupWidth;
      });
    });
    let headerTop = fleetTop - 12;
    x = LEFT + NUMBER_WIDTH;
    routeGroups.forEach((route) => route.slots.forEach(() => {
      cell(x, headerTop, pairWidth, 14, 'PLATE #', { bold: true, fontSize: 5.5, fill: '0.99 0.99 0.99' });
      x += pairWidth;
      cell(x, headerTop, pairWidth, 14, 'TIME', { bold: true, fontSize: 5.5, fill: '0.99 0.99 0.99' });
      x += pairWidth;
    }));

    const firstTripRow = pageIndex * ROWS_PER_PAGE;
    const lastTripRow = Math.min(firstTripRow + ROWS_PER_PAGE, rowCount);
    let dataTop = headerTop - 14;
    for (let rowIndex = firstTripRow; rowIndex < lastTripRow; rowIndex += 1) {
      const rowHeight = 10;
      cell(LEFT, dataTop, NUMBER_WIDTH, rowHeight, String(rowIndex + 1), { fontSize: 6, center: false });
      x = LEFT + NUMBER_WIDTH;
      routeGroups.forEach((route) => route.slots.forEach((slot) => {
        const ticket = slot.tickets[rowIndex];
        cell(x, dataTop, pairWidth, rowHeight, ticket?.plate_number || '', { fontSize: 5.5 });
        x += pairWidth;
        cell(x, dataTop, pairWidth, rowHeight, ticket ? formatTime(ticket.departure_at) : '', { fontSize: 5.5 });
        x += pairWidth;
      }));
      dataTop -= rowHeight;
    }
    pages.push(commands.join('\n'));
  }

  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    `<< /Type /Pages /Kids [${pages.map((_, index) => `${5 + index * 2} 0 R`).join(' ')}] /Count ${pages.length} >>`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>',
  ];
  pages.forEach((page, index) => {
    const pageId = 5 + index * 2;
    const contentId = pageId + 1;
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentId} 0 R >>`);
    objects.push(`<< /Length ${page.length} >>\nstream\n${page}\nendstream`);
  });
  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((object, index) => { offsets.push(pdf.length); pdf += `${index + 1} 0 obj\n${object}\nendobj\n`; });
  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => { pdf += `${String(offset).padStart(10, '0')} 00000 n \n`; });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  downloadBlob(new Blob([pdf], { type: 'application/pdf' }), `dispatch-masterlist-${date}.pdf`);
}

function printMarkup(routes, date, subCollectorName) {
  return makeMasterlistHtml(routes, date, subCollectorName);
}
function ascii(value) { return String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\x20-\x7E]/g, '?'); }
function pdfEscape(value) { return ascii(value).replace(/([\\()])/g, '\\$1'); }
function escapeHtml(value) { return String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]); }
function downloadBlob(blob, fileName) { const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = fileName; anchor.click(); window.setTimeout(() => URL.revokeObjectURL(url), 1000); }
function Detail({ label, value }) { return <div className="flex justify-between gap-4 border-b border-[#e3edf1] py-2.5 text-xs last:border-0"><dt className="text-[#6b7f88]">{label}</dt><dd className="m-0 max-w-[68%] break-all text-right font-semibold text-[#28495a]">{value || '—'}</dd></div>; }
function CalendarIcon() { return <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="3.5" y="5" width="17" height="15.5" rx="2" stroke="currentColor" strokeWidth="1.5"/><path d="M7.5 3v4M16.5 3v4M4 9h16" stroke="currentColor" strokeWidth="1.5"/></svg>; }
function SearchIcon() { return <svg className="h-4 w-4" viewBox="0 0 20 20" fill="none" aria-hidden="true"><circle cx="8.7" cy="8.7" r="5.9" stroke="currentColor" strokeWidth="1.4"/><path d="m13.2 13.2 4 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>; }
function ExpandIcon() { return <svg className="h-4 w-4" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M7 3H3v4m10-4h4v4M3 13v4h4m10-4v4h-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>; }
function DocumentIcon() { return <svg className="h-[15px] w-[15px]" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M5 2.8h6l4 4v10.4H5a1.5 1.5 0 0 1-1.5-1.5V4.3A1.5 1.5 0 0 1 5 2.8Z" stroke="currentColor" strokeWidth="1.4"/><path d="M11 3v4h4M7 11h6M7 14h6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>; }
function LayersIcon() { return <svg className="h-[15px] w-[15px]" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="m10 2.8 7 3.7-7 3.7-7-3.7 7-3.7Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/><path d="m3 9.6 7 3.7 7-3.7M3 12.7l7 3.7 7-3.7" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/></svg>; }
function PrintIcon() { return <svg className="h-[15px] w-[15px]" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M5 7V3h10v4M5 14H3.5A1.5 1.5 0 0 1 2 12.5v-4A1.5 1.5 0 0 1 3.5 7h13A1.5 1.5 0 0 1 18 8.5v4a1.5 1.5 0 0 1-1.5 1.5H15" stroke="currentColor" strokeWidth="1.4"/><path d="M5 11h10v6H5z" stroke="currentColor" strokeWidth="1.4"/><circle cx="15.2" cy="9.5" r=".7" fill="currentColor"/></svg>; }
function GridIcon() { return <svg className="h-[15px] w-[15px]" viewBox="0 0 20 20" fill="none" aria-hidden="true"><rect x="2.5" y="3" width="15" height="14" rx="1.5" stroke="currentColor" strokeWidth="1.3"/><path d="M2.5 7.5h15M7.5 7.5V17m5-9.5V17M2.5 12h15" stroke="currentColor" strokeWidth="1.2"/></svg>; }

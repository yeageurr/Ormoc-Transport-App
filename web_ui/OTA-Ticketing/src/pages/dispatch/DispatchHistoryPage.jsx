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

function makeSampleReport(date) {
  const terminal = { name: 'Terminal 2 (City Proper)', address: 'Ormoc City, Leyte' };
  const routeNames = ['Albuera', 'Sabang Bao', 'Puertobello', 'Valencia'];
  const routes = routeNames.map((route_name, index) => ({
    route_id: index + 1, route_name, terminal_name: terminal.name,
    opened_at: `${date}T06:00:00+08:00`, closed_at: `${date}T21:00:00+08:00`,
    tickets: index < 3 ? [0, 1].map((n) => ({
      ticket_id: `demo-${index}-${n}`, reference_number: `DEMO${index}${n}01`, queue_number: 101 + n,
      route_id: index + 1, route_name, operating_date: date,
      plate_number: ['ZX-0233', 'ABC-1234', 'XYZ-7890'][index],
      driver_name: ['Anthony Domasig', 'Maria Santos', 'Jose Ramirez'][index],
      driver_contact: ['09171234567', '09181234567', '09191234567'][index],
      issued_at: `${date}T${String(7 + n).padStart(2, '0')}:00:00+08:00`, departure_at: `${date}T${String(7 + n).padStart(2, '0')}:15:00+08:00`,
    })) : [],
  }));
  return { operating_date: date, terminal, routes, sample: true };
}

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
  const [actionType, setActionType] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [password, setPassword] = useState('');
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
        setDateRecords(dates.length || !import.meta.env.DEV ? dates : [{ operating_date: todayInPH(), opened_at: `${todayInPH()}T06:00:00+08:00`, closed_at: `${todayInPH()}T21:00:00+08:00`, total_tickets: 6, sample: true }]);
        setActiveRouteCount(assignments.filter((assignment) => !assignment.closed_at).length);
      })
      .catch((requestError) => {
        if (!mounted) return;
        setError(requestError.message || 'Could not load dispatch records.');
        if (import.meta.env.DEV) setDateRecords([{ operating_date: todayInPH(), opened_at: `${todayInPH()}T06:00:00+08:00`, closed_at: `${todayInPH()}T21:00:00+08:00`, total_tickets: 6, sample: true }]);
      })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);

  const filteredDateRecords = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return dateRecords.filter((row) => (!dateFilter || row.operating_date === dateFilter) && (!needle || row.operating_date.includes(needle)));
  }, [dateRecords, dateFilter, search]);
  const routes = report?.routes || [];

  function requestAction(type) {
    setActionType(type);
    setAuthError('');
    setConfirmOpen(true);
  }

  async function authorizeAndRun() {
    if (actionType === 'Print') printWindow.current = window.open('', '_blank');
    setAuthBusy(true);
    setAuthError('');
    try {
      await verifyCurrentPassword(password);
      setAuthOpen(false);
      setConfirmOpen(false);
      setPassword('');
      if (actionType === 'PDF') downloadPdf(routes, report?.operating_date, report?.terminal);
      else if (actionType === 'Excel spreadsheet') downloadExcel(routes, report?.operating_date, report?.terminal);
      else if (actionType === 'Print') {
        const target = printWindow.current;
        if (!target || target.closed) throw new Error('The print window was blocked. Allow pop-ups and try again.');
        target.document.open();
        target.document.write(printMarkup(routes, report?.operating_date, report?.terminal));
        target.document.close();
        target.focus();
        window.setTimeout(() => target.print(), 250);
      }
      setActionType('');
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
          {filteredDateRecords.map((row) => <tr className="h-[48px] border-b border-[#9daeb7] last:border-0" key={`${row.operating_date}-${row.sample ? 'sample' : 'live'}`}><td className="px-[9px] py-0"><button className="grid h-7 w-7 cursor-pointer place-items-center rounded text-[#345365] hover:bg-[#eaf7fc]" onClick={async () => { setLoading(true); try { const data = row.sample ? makeSampleReport(row.operating_date) : await listDispatchHistory(row.operating_date); setReport(data); setSelected(row); } catch (requestError) { setError(requestError.message || 'Could not load the daily dispatch record.'); } finally { setLoading(false); } }} aria-label={`View dispatch record for ${row.operating_date}`} title="View full daily record"><ExpandIcon /></button></td><td className="px-[9px] py-0 text-center">{dateLabel(row.operating_date)}{row.sample && <span className="ml-2 rounded-full bg-amber-100 px-2 py-1 text-[9px] font-semibold text-amber-800">Sample</span>}</td><td className="px-[9px] py-0 text-center">{formatTime(row.opened_at)}</td><td className="px-[9px] py-0 text-center">{formatTime(row.closed_at)}</td><td className="px-[9px] py-0 text-center">{row.total_tickets}</td></tr>)}
          {!loading && !filteredDateRecords.length && <tr className="h-full"><td className="h-full" colSpan="5"><EmptyTableState fill /></td></tr>}{loading && <tr><td colSpan="5" className="h-28 text-center text-[#718792]">Loading dispatch records…</td></tr>}
        </tbody></table></div>
      </section>
    </main>
    {selected && report && <DailyReportModal report={report} onClose={() => { setSelected(null); setReport(null); }} onTicketSelect={(ticket, route) => setTicketDetail({ ...ticket, route_opened_at: route.opened_at, route_closed_at: route.closed_at })} onAction={requestAction} />}
    {ticketDetail && <TicketDetailsModal ticket={ticketDetail} onClose={() => setTicketDetail(null)} />}
    {confirmOpen && <div className="fixed inset-0 z-[60] grid place-items-center bg-[#0c1f2a]/45 p-4"><section className="w-full max-w-[430px] rounded-xl bg-white p-6 shadow-xl"><p className="m-0 text-[10px] font-bold tracking-[.1em] text-[#0879ac]">CONFIRM {actionType.toUpperCase()}</p><h2 className="mb-2 mt-2 text-xl font-bold text-[#173b4e]">{actionType === 'Print' ? 'Print dispatch record?' : 'Export dispatch record?'}</h2><p className="text-sm leading-relaxed text-[#536c78]">Export dispatch record on <strong>{reportTitle}</strong> to <strong>{actionType}</strong>?</p><div className="mt-6 flex justify-end gap-2"><button className="rounded-md bg-[#edf4f7] px-4 py-2 text-xs font-semibold text-[#34515f]" onClick={() => { setConfirmOpen(false); setActionType(''); }}>Cancel</button><button className="rounded-md bg-[#168dff] px-4 py-2 text-xs font-semibold text-white" onClick={() => { setConfirmOpen(false); setAuthOpen(true); }}>Confirm</button></div></section></div>}
    {authOpen && <div className="fixed inset-0 z-[70] grid place-items-center bg-[#0c1f2a]/45 p-4"><form className="relative w-full max-w-[420px] rounded-xl border border-[#d4e4eb] bg-white p-7 shadow-[0_18px_55px_rgba(10,44,63,0.2)]" onSubmit={(e) => { e.preventDefault(); void authorizeAndRun(); }}>
      <button type="button" className="absolute right-4 top-3 grid h-8 w-8 place-items-center rounded-full border-0 bg-transparent text-2xl text-[#506b77]" aria-label="Close authorization" onClick={() => { setAuthOpen(false); setPassword(''); if (printWindow.current && !printWindow.current.closed) printWindow.current.close(); }}>×</button>
      <span className="text-[10px] font-bold tracking-[.1em] text-[#0879ac]">AUTHORIZATION REQUIRED</span><h2 className="mb-1 mt-2 text-[22px] font-bold text-[#173b4e]">Verify your identity</h2><p className="mb-5 text-[13px] text-[#536c78]">Enter your password for verification.</p>
      <label className="mb-2 block text-xs font-semibold text-[#294a5b]" htmlFor="history-export-password">Password</label><input id="history-export-password" autoFocus type="password" autoComplete="current-password" placeholder="password here..." className="h-[42px] w-full rounded-md border border-[#acc4ce] px-3 text-sm outline-none focus:border-[#168dff]" value={password} onChange={(e) => setPassword(e.target.value)} required />
      {authError && <p role="alert" className="mb-0 mt-2 text-xs text-rose-700">{authError}</p>}
      <div className="mt-6 flex justify-end gap-2"><button type="button" className="rounded-md bg-[#edf4f7] px-4 py-2 text-xs font-semibold text-[#34515f]" onClick={() => { setAuthOpen(false); setPassword(''); if (printWindow.current && !printWindow.current.closed) printWindow.current.close(); }}>Close</button><button type="submit" disabled={authBusy || !password} className="rounded-md bg-[#168dff] px-4 py-2 text-xs font-semibold text-white disabled:opacity-50">{authBusy ? 'Verifying…' : 'Continue'}</button></div>
    </form></div>}
  </div>;
}

function DailyReportModal({ report, onClose, onTicketSelect, onAction }) {
  return <div className="fixed inset-0 z-50 grid place-items-center bg-[#0c1f2a]/55 p-4" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}><section className="relative flex max-h-[92vh] w-full max-w-[960px] flex-col overflow-hidden rounded-xl border border-[#d4e4eb] bg-white shadow-[0_18px_55px_rgba(10,44,63,0.2)]" role="dialog" aria-modal="true" aria-labelledby="daily-report-title">
    <button type="button" className="absolute right-4 top-3 z-10 grid h-8 w-8 cursor-pointer place-items-center rounded-full border-0 bg-transparent text-2xl text-[#506b77] hover:bg-[#edf6fa]" aria-label="Close record" onClick={onClose}>×</button>
    <div className="min-h-0 overflow-y-auto p-6 max-[600px]:p-3"><div className="mx-auto max-w-[900px] text-center text-[#29485a]"><p className="m-0 text-[11px]">Republic of the Philippines</p><p className="m-0 text-[11px]">Ormoc City, Leyte</p><p className="mb-1 mt-0 text-[11px]">Terminal 2 (City Proper)</p><h2 id="daily-report-title" className="mb-5 mt-0 text-base font-bold">{dateLabel(report.operating_date)}</h2></div>
      <div className="mx-auto grid max-w-[900px] gap-5">{report.routes.map((route) => <section key={route.route_id} className="overflow-hidden border border-[#8fa7b0]"><div className="flex flex-wrap items-center justify-between gap-2 bg-[#f2f8fb] px-3 py-2"><h3 className="m-0 text-sm font-bold text-[#244659]">{route.route_name}</h3><div className="flex gap-4 text-[10px] text-[#526c78]"><span>Opened at: <strong>{formatTime(route.opened_at)}</strong></span><span>Closed at: <strong>{formatTime(route.closed_at)}</strong></span></div></div>
        <table className="w-full border-collapse text-left text-[11px] text-[#29485a]"><thead><tr><th className="w-1/2 border-y border-[#9daeb7] px-3 py-2 text-center font-semibold">Plate Number</th><th className="w-1/2 border-y border-[#9daeb7] px-3 py-2 text-center font-semibold">Time of Departure</th></tr></thead><tbody>
          {route.tickets.map((ticket) => <tr key={ticket.ticket_id} className="h-[42px] border-b border-[#d4e0e5] last:border-0"><td className="px-3 py-0 text-center"><button className="cursor-pointer border-0 bg-transparent p-1 font-semibold text-[#0879ac] hover:underline" onClick={() => onTicketSelect(ticket, route)} title="View full dispatch ticket">{ticket.plate_number}</button></td><td className="px-3 py-0 text-center">{formatTime(ticket.departure_at)}</td></tr>)}
          {!route.tickets.length && <tr className="h-[54px]"><td colSpan="2" className="text-center text-xs text-[#758891]">No tickets issued for this route</td></tr>}
          <tr className="h-[38px] border-t border-[#9daeb7] bg-[#f8fbfd]"><td colSpan="2" className="px-3 text-right text-[11px] font-semibold">Total tickets issued: {route.tickets.length}</td></tr>
        </tbody></table></section>)}</div>
    </div><div className="flex shrink-0 flex-wrap justify-end gap-2 border-t border-[#e3edf1] bg-white p-4"><button className="rounded-md border border-[#9acfe8] bg-white px-3 py-2 text-xs font-semibold text-[#0879ac]" onClick={() => onAction('PDF')}>Export PDF</button><button className="rounded-md border border-[#9acfe8] bg-white px-3 py-2 text-xs font-semibold text-[#0879ac]" onClick={() => onAction('Excel spreadsheet')}>Export Excel</button><button className="rounded-md border border-[#9acfe8] bg-white px-3 py-2 text-xs font-semibold text-[#0879ac]" onClick={() => onAction('Print')}>Print</button></div>
  </section></div>;
}

function TicketDetailsModal({ ticket, onClose }) {
  return <div className="fixed inset-0 z-50 grid place-items-center bg-[#0c1f2a]/45 p-4" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}><section className="relative max-h-[90vh] w-full max-w-[620px] overflow-y-auto rounded-xl border border-[#d4e4eb] bg-white p-6 shadow-[0_18px_55px_rgba(10,44,63,0.2)]" role="dialog" aria-modal="true" aria-labelledby="dispatch-detail-title">
    <button type="button" className="absolute right-4 top-3 grid h-8 w-8 cursor-pointer place-items-center rounded-full border-0 bg-transparent text-2xl text-[#506b77] hover:bg-[#edf6fa]" aria-label="Close record" onClick={onClose}>×</button><span className="text-[10px] font-bold tracking-[.1em] text-[#0879ac]">DISPATCH TICKET · {ticket.reference_number}</span><h2 id="dispatch-detail-title" className="mb-4 mt-1 pr-10 text-[23px] font-bold text-[#173b4e]">{ticket.route_name}</h2>
    <dl className="grid gap-0"><Detail label="Plate number" value={ticket.plate_number} /><Detail label="Driver" value={ticket.driver_name} /><Detail label="Driver contact" value={ticket.driver_contact} /><Detail label="Time of departure" value={formatDateTime(ticket.departure_at)} /><Detail label="Ticket issued at" value={formatDateTime(ticket.issued_at)} /><Detail label="Queue number" value={ticket.queue_number} /><Detail label="Route operation opened at" value={formatDateTime(ticket.route_opened_at)} /><Detail label="Route operation closed at" value={formatDateTime(ticket.route_closed_at)} /><Detail label="Operating date" value={dateLabel(ticket.operating_date)} /><Detail label="Ticket ID" value={ticket.ticket_id} /></dl>
  </section></div>;
}

function exportLines(routes, date) {
  return ['Republic of the Philippines', 'Ormoc City, Leyte', 'Terminal 2 (City Proper)', dateLabel(date), '', ...routes.flatMap((route) => [
    route.route_name,
    `Opened at: ${formatDateTime(route.opened_at)} | Closed at: ${formatDateTime(route.closed_at)}`,
    'Plate Number | Driver Name | Driver Contact | Time of Departure',
    ...route.tickets.map((ticket) => `${ticket.plate_number} | ${ticket.driver_name} | ${ticket.driver_contact} | ${formatDateTime(ticket.departure_at)}`),
    `Total tickets issued: ${route.tickets.length}`,
    '',
  ])];
}
function downloadExcel(routes, date) {
  const lines = exportLines(routes, date);
  const htmlRows = lines.map((line) => `<tr><td>${escapeHtml(line)}</td></tr>`).join('');
  const blob = new Blob([`<html><head><meta charset="utf-8"></head><body><table>${htmlRows}</table></body></html>`], { type: 'application/vnd.ms-excel;charset=utf-8' });
  downloadBlob(blob, `dispatch-record-${date}.xls`);
}
function downloadPdf(routes, date) {
  const lines = exportLines(routes, date).flatMap(wrapPdfLine);
  const pages = [];
  while (lines.length) pages.push(lines.splice(0, 48));
  if (!pages.length) pages.push(['No dispatch records for this date.']);
  const objects = [];
  const pageIds = pages.map((_, i) => 4 + i * 2);
  objects.push('<< /Type /Catalog /Pages 2 0 R >>');
  objects.push(`<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pageIds.length} >>`);
  objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
  pages.forEach((page, i) => {
    const pageId = pageIds[i];
    const contentId = pageId + 1;
    const commands = ['BT', '/F1 9 Tf', '48 790 Td', '14 TL', ...page.map((line) => `(${pdfEscape(line)}) Tj T*`), 'ET'].join('\n');
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 842] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentId} 0 R >>`);
    objects.push(`<< /Length ${commands.length} >>\nstream\n${commands}\nendstream`);
  });
  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((object, i) => { offsets.push(pdf.length); pdf += `${i + 1} 0 obj\n${object}\nendobj\n`; });
  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => { pdf += `${String(offset).padStart(10, '0')} 00000 n \n`; });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  downloadBlob(new Blob([pdf], { type: 'application/pdf' }), `dispatch-record-${date}.pdf`);
}
function printMarkup(routes, date) {
  const body = exportLines(routes, date).map((line) => `<p>${escapeHtml(line)}</p>`).join('');
  return `<!doctype html><html><head><meta charset="utf-8"><title>Dispatch records ${escapeHtml(date)}</title><style>body{font:12px Arial,sans-serif;color:#173b4e;margin:32px}p{margin:0 0 8px;white-space:pre-wrap}@media print{body{margin:14mm}}</style></head><body>${body}</body></html>`;
}
function wrapPdfLine(line) { const safe = ascii(line); const output = []; for (let i = 0; i < safe.length; i += 92) output.push(safe.slice(i, i + 92)); return output.length ? output : ['']; }
function ascii(value) { return String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\x20-\x7E]/g, '?'); }
function pdfEscape(value) { return ascii(value).replace(/([\\()])/g, '\\$1'); }
function escapeHtml(value) { return String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]); }
function downloadBlob(blob, fileName) { const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = fileName; anchor.click(); window.setTimeout(() => URL.revokeObjectURL(url), 1000); }
function Detail({ label, value }) { return <div className="flex justify-between gap-4 border-b border-[#e3edf1] py-2.5 text-xs last:border-0"><dt className="text-[#6b7f88]">{label}</dt><dd className="m-0 max-w-[68%] break-all text-right font-semibold text-[#28495a]">{value || '—'}</dd></div>; }
function CalendarIcon() { return <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="3.5" y="5" width="17" height="15.5" rx="2" stroke="currentColor" strokeWidth="1.5"/><path d="M7.5 3v4M16.5 3v4M4 9h16" stroke="currentColor" strokeWidth="1.5"/></svg>; }
function SearchIcon() { return <svg className="h-4 w-4" viewBox="0 0 20 20" fill="none" aria-hidden="true"><circle cx="8.7" cy="8.7" r="5.9" stroke="currentColor" strokeWidth="1.4"/><path d="m13.2 13.2 4 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>; }
function ExpandIcon() { return <svg className="h-4 w-4" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M7 3H3v4m10-4h4v4M3 13v4h4m10-4v4h-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>; }

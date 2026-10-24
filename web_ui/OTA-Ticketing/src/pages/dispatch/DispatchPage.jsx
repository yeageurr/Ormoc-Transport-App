import { useCallback, useEffect, useMemo, useState } from 'react';
import Navbar from '../../components/layout/Navbar';
import { listRoutes } from '../../api/routes.api';
import { createDispatcherAssignment, closeDispatcherAssignment, listDispatcherAssignments } from '../../api/dispatcherAssignments.api';
import { listAuditLogs, listDispatchers } from '../../api/dispatch.api';
import { useAuth } from '../../context/AuthContext';
import setTitle from '../../components/pageTitle';

const PH = 'Asia/Manila';
const todayInPH = () => new Intl.DateTimeFormat('en-CA', { timeZone: PH, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
const fullDate = (date) => new Intl.DateTimeFormat('en-US', { timeZone: PH, weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' }).format(date);
const shortDateTime = (value) => new Intl.DateTimeFormat('en-GB', { timeZone: PH, day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value));
const NAV_ITEMS = [
  { id: 'dispatch', label: 'Dispatch Operations' },
  { id: 'users', label: 'Users' },
];

export default function DispatchPage() {
  setTitle('Dispatch Operations');
  const { account, signOut } = useAuth();
  const [routes, setRoutes] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [dispatchers, setDispatchers] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [now, setNow] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [selectedDispatcher, setSelectedDispatcher] = useState('');
  const [detailsAssignment, setDetailsAssignment] = useState(null);
  const [busy, setBusy] = useState(false);
  const [confirmCloseAll, setConfirmCloseAll] = useState(false);
  const operatingDate = todayInPH();
  const goTo = (page) => { window.location.hash = `#${page}`; };

  const refresh = useCallback(async () => {
    setError('');
    try {
      const [routeRows, assignmentRows, dispatcherRows, logs] = await Promise.all([
        listRoutes(),
        listDispatcherAssignments(todayInPH()),
        listDispatchers(),
        listAuditLogs('dispatcher_assignments'),
      ]);
      setRoutes(routeRows);
      setAssignments(assignmentRows);
      setDispatchers(dispatcherRows);
      setAuditLogs(logs.slice(0, 8));
    } catch (err) {
      setError(err.message || 'Could not load dispatch operations.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const clock = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(clock);
  }, [refresh]);

  const assignmentsByRoute = useMemo(() => {
    const grouped = new Map();
    assignments.forEach((assignment) => {
      const current = grouped.get(assignment.route_id);
      if (!current || new Date(assignment.created_at) > new Date(current.created_at)) grouped.set(assignment.route_id, assignment);
    });
    return grouped;
  }, [assignments]);
  const activeAssignments = assignments.filter((assignment) => !assignment.closed_at);
  const canClose = new Intl.DateTimeFormat('en-GB', { timeZone: PH, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(now) >= '21:00';

  async function handleAssign(event) {
    event.preventDefault();
    if (!selectedRoute || !selectedDispatcher) return;
    setBusy(true);
    setError('');
    try {
      await createDispatcherAssignment({ operating_date: operatingDate, route_id: selectedRoute.route_id, dispatcher_id: Number(selectedDispatcher) });
      setSelectedRoute(null);
      setSelectedDispatcher('');
      setNotice(`Dispatch ticketing opened for ${selectedRoute.destination?.name || selectedRoute.queue_prefix}.`);
      await refresh();
    } catch (err) {
      setError(err.message || 'Could not assign the dispatcher.');
    } finally {
      setBusy(false);
    }
  }

  async function handleCloseAll() {
    setBusy(true);
    setError('');
    setNotice('');
    const results = await Promise.allSettled(activeAssignments.map(({ id }) => closeDispatcherAssignment(id)));
    const failed = results.filter((result) => result.status === 'rejected');
    setConfirmCloseAll(false);
    await refresh();
    if (failed.length) setError(`${failed.length} operation(s) could not be closed. ${failed[0].reason?.message || ''}`);
    else setNotice('All open route operations have been closed.');
    setBusy(false);
  }

  return (
    <div className="p-2.5 gap-2.5 box-border flex h-screen flex-row justify-center bg-[#A9E4FF] text-[#18364a]">
      <Navbar account={account} items={NAV_ITEMS} activePage="dispatch" onNavigate={goTo} onLogout={() => void signOut()} />

      <main className=" flex flex-col gap-1 box-border h-full min-h-[calc(100vh-32px)] flex-1 rounded-lg bg-[#A9E4FF] max-[760px]:mx-2 max-[760px]:my-2 max-[760px]:min-h-[calc(100vh-16px)]">
        <header className="rounded-lg top-0 flex min-h-[47px] items-center justify-between border-b border-[#b3d7e6] bg-[#f3faff] px-3 max-[760px]:px-[5px]">
          <strong className="text-[13px] font-semibold">{account?.role === 'ticketing_officer' ? 'Ticketing Officer' : 'admin'}</strong>
          <div className="flex items-center gap-[18px] max-[760px]:gap-[6px]"><span className="inline-flex items-center gap-[5px] rounded-[7px] bg-[#a6e3fa] px-[10px] py-[5px] text-[11px] text-[#183b4c] max-[760px]:text-[0px]"><CalendarIcon /> {fullDate(now)}</span><button className="inline-flex cursor-pointer items-center gap-[6px] rounded-[7px] border border-[#b7cbd3] bg-transparent px-[10px] py-[5px] text-[11px] text-[#304851] disabled:opacity-50 max-[760px]:text-[0px]" onClick={() => void refresh()} disabled={loading}><RefreshIcon /> Refresh</button></div>
        </header>

        <section className="box-border min-h-[calc(100vh-79px)] rounded-lg bg-[#f5fbff] px-[10px] pb-7 pt-[15px] max-[760px]:min-h-[calc(100vh-63px)] max-[760px]:px-[5px] max-[760px]:pb-5 max-[760px]:pt-[10px]">
          <div className="flex min-h-20 items-center justify-between rounded-[11px] border border-[#9acfe8] bg-white px-[26px] py-[11px] max-[760px]:items-start max-[760px]:px-[11px]">
            <div><small className="block text-[9px] text-[#466475]">Today, {fullDate(now)}</small><strong className="mt-[3px] block text-[25px] font-semibold leading-[1.05] text-[#27495b]">{new Intl.DateTimeFormat('en-GB', { timeZone: PH, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(now)}</strong><span className="mt-1 block text-[9px] text-[#486272] max-[760px]:max-w-[190px] max-[760px]:leading-[1.35]">Manual closing is available from 21:00. Open operations close automatically after 24 hours.</span></div>
            <div className="flex items-center gap-[34px] max-[760px]:flex-col max-[760px]:items-end max-[760px]:gap-2"><strong className="whitespace-nowrap text-sm text-[#008b43] max-[760px]:text-xs">{activeAssignments.length} Routes Active</strong><button className="h-[31px] min-w-[82px] cursor-pointer rounded-md border-0 bg-[#ff383b] text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-45" disabled={!activeAssignments.length || !canClose || busy} onClick={() => setConfirmCloseAll(true)}>Close All</button></div>
          </div>

          {error && <div className="mt-3 rounded-[7px] bg-[#fff0f0] px-[13px] py-[10px] text-[13px] text-[#a62828]" role="alert">{error}</div>}
          {notice && <div className="mt-3 rounded-[7px] bg-[#e9faf2] px-[13px] py-[10px] text-[13px] text-[#176743]" role="status">{notice}</div>}

          <section className="mt-[41px] max-[760px]:mt-[25px]">
            <div className="mb-[11px] ml-[5px] mr-[5px] flex items-center justify-between"><h1 className="m-0 text-base font-bold text-[#244659]">Route Activities</h1><span className="text-[11px] text-[#597582]">{loading ? 'Loading routes…' : `${routes.length} routes`}</span></div>
            {routes.length === 0 && !loading ? <div className="mx-[5px] rounded-[10px] border border-[#a8d5e8] bg-white p-8 text-center text-[#607987]">No active routes are available.</div> : <div className="grid gap-[10px] px-[5px]">
              {routes.map((route) => {
                const assignment = assignmentsByRoute.get(route.route_id);
                const active = Boolean(assignment && !assignment.closed_at);
                const statusText = active ? 'Active' : assignment ? 'Closed' : 'Open';
                return <article className="flex min-h-[78px] items-center gap-[30px] rounded-[11px] border border-[#a8d5e8] bg-white px-[30px] py-[13px] max-[760px]:flex-wrap max-[760px]:gap-2 max-[760px]:p-3" key={route.route_id}>
                  <div className="min-w-0 flex-1 max-[760px]:basis-[calc(100%-10px)]"><strong className="block overflow-hidden text-ellipsis whitespace-nowrap text-[23px] font-semibold text-[#284a5d] max-[760px]:text-lg">{route.destination?.name || `Route ${route.route_id}`}</strong><span className="mt-[3px] block text-[11px] text-[#617a86]">{route.queue_prefix} · {Number(route.distance).toFixed(1)} km</span></div>
                  {active && <span className="whitespace-nowrap text-[11px] text-[#506a77] max-[760px]:flex-1">Dispatcher #{assignment.dispatcher_id}</span>}
                  <span className={`min-w-[60px] text-center text-[13px] font-semibold max-[760px]:min-w-0 ${active ? 'text-[#008c44]' : assignment ? 'text-[#6a7880]' : 'text-[#008bd6]'}`}>{statusText}</span>
                  {active ? <button className="inline-flex h-[29px] w-[86px] cursor-pointer items-center justify-center gap-2 rounded-md border-0 bg-[#64f8ad] text-[11px] text-[#183c4e] max-[760px]:w-[70px]" onClick={() => setDetailsAssignment({ assignment, route })}>View <ExpandIcon /></button> : <button className="inline-flex h-[29px] w-[86px] cursor-pointer items-center justify-center gap-2 rounded-md border-0 bg-[#a4e2fa] text-[11px] text-[#183c4e] max-[760px]:w-[70px]" onClick={() => { setSelectedRoute(route); setSelectedDispatcher(''); }}>Assign <EditIcon /></button>}
                </article>;
              })}
            </div>}
          </section>

          <section className="mt-11.5 max-[760px]:mt-[30px]">
            <div className="mb-[11px] ml-[5px] mr-[5px] flex items-center justify-between"><h2 className="m-0 text-base font-bold text-[#244659]">Recent Dates</h2><span className="text-[11px] text-[#597582]">Dispatch operation history</span></div>
            <div className="min-h-[252px] overflow-x-auto rounded-[5px] border border-[#a8d5e8] bg-white px-[10px] py-[7px]">
              <table className="w-full border-collapse text-left text-[11px] text-[#29485a] max-[760px]:min-w-[620px]"><thead><tr>{['Action', 'Date and Time', 'Performed By', 'Routes Affected'].map((heading) => <th className="border-b border-[#9daeb7] px-[9px] py-[10px] text-[10px] font-semibold" key={heading}>{heading}</th>)}</tr></thead>
                <tbody>{auditLogs.map((item) => <tr key={item.audit_id}><td className="w-1/4 border-b border-[#9daeb7] px-[9px] py-[10px] text-[#38586a]">{item.action === 'create' ? 'Opened dispatch ticketing' : 'Closed dispatch ticketing'}</td><td className="border-b border-[#9daeb7] px-[9px] py-[10px]">{shortDateTime(item.created_at)}</td><td className="border-b border-[#9daeb7] px-[9px] py-[10px]">{item.actor?.account_code || `Account ${item.actor_id}`}</td><td className="border-b border-[#9daeb7] px-[9px] py-[10px]">{item.details?.match(/route (\d+)/i)?.[1] ? `Route ${item.details.match(/route (\d+)/i)[1]}` : '—'}</td></tr>)}
                {!auditLogs.length && <tr><td colSpan="4" className="h-20 border-b border-[#9daeb7] px-[9px] py-[10px] text-center text-[#718792]">No dispatch operation history yet.</td></tr>}</tbody>
              </table>
            </div>
          </section>
        </section>
      </main>

      {selectedRoute && <div className="fixed inset-0 z-50 grid place-items-center bg-[#0c1f2a]/40 p-[18px]" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) setSelectedRoute(null); }}>
        <form className="relative w-full max-w-[460px] rounded-[13px] border border-[#d4e4eb] bg-white p-7 shadow-[0_18px_55px_rgba(10,44,63,0.2)]" onSubmit={handleAssign}>
          <button type="button" className="absolute right-[15px] top-3 cursor-pointer border-0 bg-transparent text-[25px] text-[#506b77]" aria-label="Close" onClick={() => setSelectedRoute(null)}>×</button>
          <span className="text-[10px] font-bold tracking-[.1em] text-[#0879ac]">OPEN ROUTE OPERATION</span><h2 className="mb-2 mr-5 mt-2 text-[22px] font-bold text-[#173b4e]">Assign a dispatcher</h2><p className="mb-5 text-[13px] leading-relaxed text-[#536c78]">Choose an active dispatcher for <strong className="text-[#284b5c]">{selectedRoute.destination?.name || `Route ${selectedRoute.route_id}`}</strong> on {fullDate(now)}.</p>
          <label className="mb-[6px] mt-[15px] block text-xs font-semibold text-[#294a5b]" htmlFor="dispatcher-select">Dispatcher</label>
          <select id="dispatcher-select" className="h-[42px] w-full rounded-md border border-[#acc4ce] bg-white px-[10px] text-[#284858]" value={selectedDispatcher} onChange={(event) => setSelectedDispatcher(event.target.value)} required>
            <option value="">Select dispatcher</option>{dispatchers.map((dispatcher) => <option key={dispatcher.account_id} value={dispatcher.account_id}>{dispatcher.account_code} · {dispatcher.username}</option>)}
          </select>
          {!dispatchers.length && <p className="mb-0 mt-[9px] text-[11px] text-[#758891]">No active dispatcher accounts are available.</p>}
          <div className="mt-[25px] flex justify-end gap-[9px]"><button type="button" className="min-h-[38px] cursor-pointer rounded-md border-0 bg-[#edf4f7] px-[14px] text-xs font-semibold text-[#34515f] disabled:opacity-50" onClick={() => setSelectedRoute(null)} disabled={busy}>Cancel</button><button className="min-h-[38px] cursor-pointer rounded-md border-0 bg-[#0796d1] px-[14px] text-xs font-semibold text-white disabled:opacity-50" disabled={busy || !dispatchers.length}>{busy ? 'Opening…' : 'Assign and Open'}</button></div>
        </form>
      </div>}

      {detailsAssignment && <div className="fixed inset-0 z-50 grid place-items-center bg-[#0c1f2a]/40 p-[18px]" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setDetailsAssignment(null); }}>
        <section className="relative w-full max-w-[460px] rounded-[13px] border border-[#d4e4eb] bg-white p-7 shadow-[0_18px_55px_rgba(10,44,63,0.2)]">
          <button type="button" className="absolute right-[15px] top-3 cursor-pointer border-0 bg-transparent text-[25px] text-[#506b77]" aria-label="Close" onClick={() => setDetailsAssignment(null)}>×</button>
          <span className="text-[10px] font-bold tracking-[.1em] text-[#0879ac]">ACTIVE OPERATION</span><h2 className="mb-2 mr-5 mt-2 text-[22px] font-bold text-[#173b4e]">{detailsAssignment.route.destination?.name || `Route ${detailsAssignment.route.route_id}`}</h2>
          <dl className="mt-[18px] grid gap-0">{[['Queue prefix', detailsAssignment.route.queue_prefix], ['Dispatcher account', `#${detailsAssignment.assignment.dispatcher_id}`], ['Opened at', shortDateTime(detailsAssignment.assignment.created_at)], ['Operating date', detailsAssignment.assignment.operating_date]].map(([label, value]) => <div className="flex justify-between gap-[10px] border-b border-[#e3edf1] py-[11px] text-xs" key={label}><dt className="text-[#6b7f88]">{label}</dt><dd className="m-0 text-right font-semibold text-[#28495a]">{value}</dd></div>)}</dl>
          {!canClose && <p className="mb-0 mt-[9px] text-[11px] text-[#758891]">Manual closing becomes available at 21:00 (Asia/Manila). This operation auto-closes after 24 hours.</p>}
          <div className="mt-[25px] flex justify-end gap-[9px]"><button type="button" className="min-h-[38px] cursor-pointer rounded-md border-0 bg-[#edf4f7] px-[14px] text-xs font-semibold text-[#34515f]" onClick={() => setDetailsAssignment(null)}>Done</button><button type="button" className="min-h-[38px] cursor-pointer rounded-md border-0 bg-[#f13c42] px-[14px] text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50" disabled={!canClose || busy} onClick={async () => { setBusy(true); try { await closeDispatcherAssignment(detailsAssignment.assignment.id); setDetailsAssignment(null); setNotice('Route operation closed.'); await refresh(); } catch (err) { setError(err.message); } finally { setBusy(false); } }}>Close operation</button></div>
        </section>
      </div>}

      {confirmCloseAll && <div className="fixed inset-0 z-50 grid place-items-center bg-[#0c1f2a]/40 p-[18px]"><section className="relative w-full max-w-[460px] rounded-[13px] border border-[#d4e4eb] bg-white p-7 shadow-[0_18px_55px_rgba(10,44,63,0.2)]">
        <span className="text-[10px] font-bold tracking-[.1em] text-[#0879ac]">CONFIRM ACTION</span><h2 className="mb-2 mr-5 mt-2 text-[22px] font-bold text-[#173b4e]">Close all route operations?</h2><p className="mb-5 text-[13px] leading-relaxed text-[#536c78]">This will close {activeAssignments.length} active operation(s) for today and expire their remaining reservations and unused tickets.</p>
        <div className="mt-[25px] flex justify-end gap-[9px]"><button className="min-h-[38px] cursor-pointer rounded-md border-0 bg-[#edf4f7] px-[14px] text-xs font-semibold text-[#34515f] disabled:opacity-50" onClick={() => setConfirmCloseAll(false)} disabled={busy}>Cancel</button><button className="min-h-[38px] cursor-pointer rounded-md border-0 bg-[#f13c42] px-[14px] text-xs font-semibold text-white disabled:opacity-50" onClick={() => void handleCloseAll()} disabled={busy}>{busy ? 'Closing…' : 'Close All'}</button></div>
      </section></div>}
    </div>
  );
}

function CalendarIcon() { return <svg className="h-[15px] w-[15px] shrink-0 max-[760px]:h-[17px] max-[760px]:w-[17px]" viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="3.5" y="5" width="17" height="15.5" rx="2" stroke="currentColor" strokeWidth="1.5"/><path d="M7.5 3v4M16.5 3v4M4 9h16" stroke="currentColor" strokeWidth="1.5"/></svg>; }
function RefreshIcon() { return <svg className="h-[15px] w-[15px] shrink-0 max-[760px]:h-[18px] max-[760px]:w-[18px]" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M20 11a8 8 0 0 0-14.6-4L4 9m0 0V5m0 4h4m-4 4a8 8 0 0 0 14.6 4L20 15m0 0v4m0-4h-4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>; }
function ExpandIcon() { return <svg className="h-4 w-4" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M7 3H3v4m10-4h4v4M3 13v4h4m10-4v4h-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>; }
function EditIcon() { return <svg className="h-4 w-4" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="m12.8 4.2 3 3M4 16l3.2-.7 8.9-8.9a2.1 2.1 0 0 0-3-3l-8.9 8.9L4 16Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/></svg>; }

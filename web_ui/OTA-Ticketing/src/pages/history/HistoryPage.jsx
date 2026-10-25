import { useEffect, useMemo, useState } from 'react';
import Navbar from '../../components/layout/Navbar';
import setTitle from '../../components/pageTitle';
import { listAuditLogs } from '../../api/dispatch.api';
import { useAuth } from '../../context/AuthContext';
import EmptyTableState from '../../components/ui/EmptyTableState';

const PH = 'Asia/Manila';
const NAV_ITEMS = [
  { id: 'dispatch', label: 'Dispatch Operations' },
  { id: 'users', label: 'Users' },
  { id: 'dispatch-history', label: 'Dispatch Records' },
  { id: 'history', label: 'Audit History' },
];
const formatDateTime = (value) => value ? new Intl.DateTimeFormat('en-GB', { timeZone: PH, day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value)) : '—';
const localDate = (value) => value ? new Intl.DateTimeFormat('en-CA', { timeZone: PH, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(value)) : '';

export default function HistoryPage() {
  setTitle('Audit History');
  const { account, signOut } = useAuth();
  const [logs, setLogs] = useState([]);
  const [selected, setSelected] = useState(null);
  const [date, setDate] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = (page) => { window.location.hash = `#${page}`; };

  useEffect(() => {
    let mounted = true;
    listAuditLogs(undefined, 'dispatcher_assignments')
      .then((auditRows) => {
        if (!mounted) return;
        setLogs(auditRows);
      })
      .catch((requestError) => { if (mounted) setError(requestError.message || 'Could not load audit history.'); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);

  const rows = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return logs.filter((item) => {
      if (date && localDate(item.created_at) !== date) return false;
      const action = describeAction(item);
      const performer = performerName(item);
      const affected = isAccountTarget(item.target_table) ? `Account ID ${item.context?.account_id || item.target_id}` : item.target_table;
      return !needle || [action, performer, affected, item.details, item.audit_id].filter(Boolean).join(' ').toLowerCase().includes(needle);
    });
  }, [date, logs, search]);

  return <div className="box-border flex h-screen flex-row gap-2.5 overflow-hidden bg-[#A9E4FF] p-2.5 text-[#18364a]">
    <Navbar account={account} items={NAV_ITEMS} activePage="history" onNavigate={navigate} onLogout={() => void signOut()} />
    <main className="box-border flex h-full min-h-0 min-w-0 flex-1 flex-col gap-1 overflow-hidden rounded-lg bg-[#A9E4FF]">
      <header className="flex min-h-[47px] items-center justify-between rounded-lg border-b border-[#b3d7e6] bg-[#f3faff] px-3">
        <strong className="text-[13px] font-semibold">Ticketing Officer</strong>
        <span className="rounded-[7px] bg-[#a6e3fa] px-[10px] py-[5px] text-[11px]">{new Intl.DateTimeFormat('en-US', { timeZone: PH, month: 'long', day: 'numeric', year: 'numeric' }).format(new Date())}</span>
      </header>
      <section className="box-border flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg bg-[#f5fbff] p-[15px] max-[760px]:p-2">
        <section className="flex min-h-20 shrink-0 items-center justify-between gap-4 rounded-[11px] border border-[#168dff] bg-white px-[26px] py-[11px] max-[600px]:px-3">
          <div><small className="block text-[9px] text-[#466475]">Today, {new Intl.DateTimeFormat('en-US', { timeZone: PH, weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' }).format(new Date())}</small><strong className="mt-[3px] block text-[25px] font-semibold leading-[1.05] text-[#27495b]">{new Intl.DateTimeFormat('en-GB', { timeZone: PH, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date())}</strong><span className="mt-1 block text-[9px] text-[#486272]">Review account and dispatch operations recorded by the system.</span></div>
          <button className="rounded-md border-0 bg-[#168dff] px-4 py-2 text-xs font-semibold text-white" onClick={() => navigate('dispatch')}>View Dispatch Operations</button>
        </section>

        <div className="mb-3 mt-9 flex shrink-0 flex-wrap items-center justify-between gap-3 px-[5px] max-[760px]:mt-5">
          <h1 className="m-0 text-[22px] font-bold text-[#244659]">Audit History</h1>
          <div className="flex flex-wrap gap-2">
            <label className="flex h-[35px] items-center gap-2 rounded-lg border border-[#becbd1] bg-white px-3 text-[11px] text-[#385667]"><CalendarIcon /><span className="sr-only">Filter by date</span><input className="bg-transparent outline-none" type="date" value={date} onChange={(event) => setDate(event.target.value)} aria-label="Filter audit history by date" /></label>
            <label className="flex h-[35px] w-[186px] items-center gap-2 rounded-lg border border-[#becbd1] px-3 text-[#243d48]"><SearchIcon /><input className="w-full min-w-0 border-0 bg-transparent text-[11px] outline-none placeholder:text-[#52636b]" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search here..." aria-label="Search audit history" /></label>
          </div>
        </div>
        {error && <div role="alert" className="mb-3 shrink-0 rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>}
        <div className="min-h-0 flex-1 overflow-auto rounded-[5px] border border-[#a8d5e8] bg-white px-[10px] py-[7px]">
          <table className={`${!loading && !rows.length ? 'h-full' : ''} w-full min-w-[620px] border-collapse text-left text-[11px] text-[#29485a]`}>
            <thead className="sticky top-0 z-10 bg-white"><tr><th className="w-[8%] border-b border-[#9daeb7] px-[9px] py-[10px]" aria-label="Full view"></th><th className="border-b border-[#9daeb7] px-[9px] py-[10px] text-center font-semibold">Type of Action</th><th className="border-b border-[#9daeb7] px-[9px] py-[10px] text-center font-semibold">Date and Time</th><th className="border-b border-[#9daeb7] px-[9px] py-[10px] text-center font-semibold">Performed By</th></tr></thead>
            <tbody className={!loading && !rows.length ? 'h-full' : ''}>
              {rows.map((item) => {
                return <tr className="h-[42px] border-b border-[#9daeb7] last:border-0" key={item.audit_id}>
                  <td className="px-[9px] py-0"><button className="grid h-7 w-7 cursor-pointer place-items-center rounded text-[#345365] hover:bg-[#eaf7fc]" onClick={() => setSelected({ item, event: null })} title="View full audit record" aria-label={`View audit record ${item.audit_id}`}><ExpandIcon /></button></td>
                  <td className="px-[9px] py-0 text-center">{describeAction(item)}</td>
                  <td className="px-[9px] py-0 text-center">{formatDateTime(item.created_at)}</td>
                  <td className="px-[9px] py-0 text-center">{performerName(item)}</td>
                </tr>;
              })}
              {!loading && !rows.length && <tr className="h-full"><td className="h-full" colSpan="4"><EmptyTableState fill /></td></tr>}
              {loading && <tr><td colSpan="4" className="h-28 text-center text-[#718792]">Loading audit history…</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </main>
    {selected && <AuditDetailsModal selected={selected} onClose={() => setSelected(null)} />}
  </div>;
}

function AuditDetailsModal({ selected: { item, event }, onClose }) {
  const bulk = item.context?.bulk_operation || event?.action_type === 'Bulk operation';
  const dispatch = item.target_table === 'dispatcher_assignments';
  const accountTarget = isAccountTarget(item.target_table);
  const details = event?.affected_routes || [];
  return <div className="fixed inset-0 z-50 grid place-items-center bg-[#0c1f2a]/45 p-4" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
    <section className="relative max-h-[90vh] w-full max-w-[610px] overflow-y-auto rounded-xl border border-[#d4e4eb] bg-white p-6 shadow-[0_18px_55px_rgba(10,44,63,0.2)]" role="dialog" aria-modal="true" aria-labelledby="audit-detail-title">
      <button type="button" className="absolute right-4 top-3 grid h-8 w-8 cursor-pointer place-items-center rounded-full border-0 bg-transparent text-2xl text-[#506b77] hover:bg-[#edf6fa]" aria-label="Close details" onClick={onClose}>×</button>
      <span className="text-[10px] font-bold tracking-[.1em] text-[#0879ac]">AUDIT RECORD</span>
      <h2 id="audit-detail-title" className="mb-4 mt-1 pr-10 text-[23px] font-bold text-[#173b4e]">{event?.action_type || describeAction(item)}</h2>
      <dl className="grid gap-0">
        <Detail label="Audit ID" value={item.audit_id} />
        <Detail label="Action Type" value={event?.action_type || describeAction(item)} />
        <Detail label="Performed By" value={event?.performed_by || performerName(item)} />
        <Detail label="Performed At" value={formatDateTime(item.created_at)} />
      </dl>
      <div className="mt-5 rounded-lg border border-[#e3edf1] p-4">
        <h3 className="mb-3 mt-0 text-sm font-semibold text-[#294a5b]">Affected Data</h3>
        <AffectedData item={item} event={event} bulk={bulk} dispatch={dispatch} accountTarget={accountTarget} details={details} />
      </div>
      <div className="mt-4 flex items-center gap-2 text-sm font-semibold"><span className={`h-2.5 w-2.5 rounded-full ${item.outcome === 'failed' ? 'bg-[#d44242]' : 'bg-[#1d9a62]'}`} /><span className={item.outcome === 'failed' ? 'text-[#c33131]' : 'text-[#16804f]'}>{item.outcome === 'failed' ? 'action failed' : 'success'}</span></div>
      <div className="mt-5 flex justify-end"><button className="rounded-md border-0 bg-[#e8f3f7] px-4 py-2 text-xs font-semibold text-[#34515f]" onClick={onClose}>Close</button></div>
    </section>
  </div>;
}

function AffectedData({ item, event, bulk, dispatch, accountTarget, details }) {
  if (bulk) return <><p className="m-0 font-semibold text-[#28495a]">All Routes</p>{details.length > 0 && <ul className="mb-0 mt-2 list-disc pl-5 text-xs text-[#526d79]">{details.map((route) => <li key={route.assignment_id}>{route.route_name} — dispatcher {route.dispatcher_name}</li>)}</ul>}</>;
  if (dispatch) {
    if (details.length) return <div className="grid gap-1">{details.map((route) => <div className="grid gap-1 text-xs text-[#526d79]" key={route.assignment_id}><Detail label="Route" value={route.route_name} /><Detail label="Route ID" value={route.route_id} /><Detail label="Assigned Dispatcher" value={`${route.dispatcher_name} (Account ${route.dispatcher_id})`} /></div>)}</div>;
    return <><Detail label="Route / dispatch" value={event?.affected_data || item.details} /><Detail label="Details" value={item.details} /></>;
  }
  if (accountTarget) return <><Detail label="Account ID" value={item.context?.account_id || (item.target_table === 'accounts' ? item.target_id : 'Unavailable')} /><Detail label="Record type" value={item.target_table} /><Detail label="Details" value={item.details} /></>;
  return <><Detail label="Record" value={`${item.target_table} #${item.target_id}`} /><Detail label="Details" value={item.details} /></>;
}

function isAccountTarget(table) { return ['accounts', 'users', 'dispatcher_profiles'].includes(table); }
function describeAction(item) {
  if (item.context?.bulk_operation) return 'Bulk operation';
  if (item.target_table === 'dispatcher_assignments') return item.details.toLowerCase().includes('open') ? 'Opened dispatch operation' : 'Closed dispatch operation';
  const verb = { create: 'Created', update: 'Updated', suspend: 'Suspended', resolve: 'Resolved', delete: 'Deleted' }[item.action] || item.action;
  return `${verb} ${isAccountTarget(item.target_table) ? 'an Account' : item.target_table}`;
}
function performerName(item) {
  if (item.actor_type === 'system') return 'System';
  if (item.actor?.role === 'ticketing_officer') return 'Ticketing Officer';
  return item.actor?.account_code || (item.actor_id ? `Account ${item.actor_id}` : 'System');
}
function Detail({ label, value }) { return <div className="flex justify-between gap-4 border-b border-[#e3edf1] py-2.5 text-xs last:border-b-0"><dt className="text-[#6b7f88]">{label}</dt><dd className="m-0 max-w-[68%] text-right font-semibold text-[#28495a]">{value || '—'}</dd></div>; }
function CalendarIcon() { return <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="3.5" y="5" width="17" height="15.5" rx="2" stroke="currentColor" strokeWidth="1.5"/><path d="M7.5 3v4M16.5 3v4M4 9h16" stroke="currentColor" strokeWidth="1.5"/></svg>; }
function SearchIcon() { return <svg className="h-[15px] w-[15px] shrink-0" viewBox="0 0 20 20" fill="none" aria-hidden="true"><circle cx="8.7" cy="8.7" r="5.9" stroke="currentColor" strokeWidth="1.4"/><path d="m13.2 13.2 4 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>; }
function ExpandIcon() { return <svg className="h-4 w-4" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M7 3H3v4m10-4h4v4M3 13v4h4m10-4v4h-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>; }

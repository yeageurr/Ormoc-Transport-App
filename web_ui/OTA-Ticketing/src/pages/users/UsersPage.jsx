import { useCallback, useEffect, useMemo, useState } from 'react';
import Navbar from '../../components/layout/Navbar';
import setTitle from '../../components/pageTitle';
import { listPortalUsers } from '../../api/portalUsers.api';
import { createDriver, createDispatcher } from '../../api/drivers.api';
import { listDispatcherAssignments } from '../../api/dispatcherAssignments.api';
import { useAuth } from '../../context/AuthContext';

const PH = 'Asia/Manila';
const NAV_ITEMS = [
  { id: 'dispatch', label: 'Dispatch Operations' },
  { id: 'users', label: 'Users' },
];
const todayInPH = () => new Intl.DateTimeFormat('en-CA', { timeZone: PH, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
const dateTime = (value) => value ? new Intl.DateTimeFormat('en-GB', { timeZone: PH, day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value)) : '—';
const dateOnly = (value) => value ? new Intl.DateTimeFormat('en-GB', { timeZone: PH, day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value)) : '—';

export default function UsersPage() {
  setTitle('Users');
  const { account, signOut } = useAuth();
  const [users, setUsers] = useState([]);
  const [activeRouteCount, setActiveRouteCount] = useState(0);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [createUserOpen, setCreateUserOpen] = useState(false);
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [now, setNow] = useState(new Date());

  const refresh = useCallback(async () => {
    setError('');
    try {
      const [userRows, assignments] = await Promise.all([
        listPortalUsers(),
        listDispatcherAssignments(todayInPH()),
      ]);
      setUsers(userRows);
      setActiveRouteCount(assignments.filter((assignment) => !assignment.closed_at).length);
    } catch (requestError) {
      setError(requestError.message || 'Could not load user accounts.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const clock = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(clock);
  }, [refresh]);

  const filteredUsers = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return users.filter((user) => {
      if (filter !== 'all' && user.role !== filter) return false;
      if (!normalizedSearch) return true;
      const searchable = [
        user.personal?.first_name,
        user.personal?.last_name,
        user.personal?.driver_id,
        user.username,
        user.email,
        user.account_code,
        user.vehicle?.plate_number,
      ].filter(Boolean).join(' ').toLowerCase();
      return searchable.includes(normalizedSearch);
    });
  }, [filter, search, users]);

  const goTo = (page) => { window.location.hash = `#${page}`; };
  const dateLabel = new Intl.DateTimeFormat('en-US', { timeZone: PH, month: 'long', day: 'numeric', year: 'numeric' }).format(now);

  return (
    <div className="box-border flex h-screen flex-row justify-center gap-2.5 bg-[#A9E4FF] p-2.5 text-[#18364a]">
      <Navbar account={account} items={NAV_ITEMS} activePage="users" onNavigate={goTo} onLogout={() => void signOut()} />
      <main className="box-border flex h-full min-h-[calc(100vh-32px)] flex-1 flex-col gap-1 rounded-lg bg-[#A9E4FF] max-[760px]:mx-2 max-[760px]:my-2 max-[760px]:min-h-[calc(100vh-16px)]">
        <header className="flex min-h-[47px] items-center justify-between rounded-lg border-b border-[#b3d7e6] bg-[#f3faff] px-3 max-[760px]:px-[5px]">
          <strong className="truncate text-[13px] font-semibold">{account?.role === 'ticketing_officer' ? 'Ticketing Officer' : 'admin'}</strong>
          <span className="inline-flex items-center gap-[5px] rounded-[7px] bg-[#a6e3fa] px-[10px] py-[5px] text-[11px] text-[#183b4c]"><CalendarIcon /> {dateLabel}</span>
        </header>

        <section className="box-border min-h-[calc(100vh-79px)] flex-1 rounded-lg bg-[#f5fbff] p-[10px] max-[760px]:min-h-[calc(100vh-63px)] max-[760px]:px-[5px]">
          <section className="flex min-h-[79px] items-center justify-between rounded-[11px] border border-[#168dff] bg-white px-[26px] py-[11px] max-[600px]:items-start max-[600px]:px-3">
            <div><small className="block text-[9px] text-[#466475]">Today, {new Intl.DateTimeFormat('en-US', { timeZone: PH, weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' }).format(now)}</small><strong className="mt-[3px] block text-[25px] font-semibold leading-[1.05] text-[#27495b]">{new Intl.DateTimeFormat('en-GB', { timeZone: PH, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(now)}</strong><span className="mt-1 block text-[9px] text-[#486272]">Dispatch operations are updated as assignments change.</span></div>
            <div className="flex items-center gap-[34px] max-[600px]:flex-col max-[600px]:items-end max-[600px]:gap-2"><strong className="whitespace-nowrap text-sm text-[#008b43] max-[600px]:text-xs">{activeRouteCount} Routes Active</strong><button className="h-[31px] cursor-pointer rounded-md border-0 bg-[#168dff] px-4 text-xs font-semibold text-white hover:bg-[#0876db]" onClick={() => goTo('dispatch')}>View Dispatch Operations</button></div>
          </section>

          <div className="mb-2 mt-9 flex flex-wrap items-center justify-between gap-3 px-[5px]">
            <h1 className="m-0 text-[22px] font-bold text-[#244659]">Users</h1>
            <div className="flex items-center gap-2">
              <label className="flex h-[35px] w-[186px] items-center gap-2 rounded-lg border border-[#becbd1] bg-transparent px-3 text-[#243d48]"><SearchIcon /><input className="w-full min-w-0 border-0 bg-transparent text-[11px] outline-none placeholder:text-[#52636b]" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search here..." aria-label="Search users" /></label>
              <button type="button" className="inline-flex h-[35px] cursor-pointer items-center gap-2 rounded-md border-0 bg-[#a6e3fa] px-3 text-[11px] font-medium text-[#173b4e] hover:bg-[#91d9f5]" onClick={() => { setNotice(''); setCreateUserOpen(true); }}>Create New User <EditIcon /></button>
            </div>
          </div>

          <div className="mb-2 flex gap-0 px-[5px]" role="tablist" aria-label="Filter users by role">
            {[['all', 'All Users'], ['driver', 'Drivers'], ['dispatcher', 'Dispatchers']].map(([value, label]) => <button key={value} role="tab" aria-selected={filter === value} className={`cursor-pointer border border-[#c4d4dc] px-[9px] py-[5px] text-[10px] first:rounded-l-md last:rounded-r-md ${filter === value ? 'bg-white font-semibold text-[#173b4e]' : 'bg-[#d3e1e7] text-[#334e5b] hover:bg-[#c6d9e1]'}`} onClick={() => setFilter(value)}>{label}</button>)}
          </div>

          {error && <div role="alert" className="mx-[5px] mb-2 rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>}
          {notice && <div role="status" className="mx-[5px] mb-2 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{notice}</div>}
          <div className="mx-[5px] min-h-[305px] overflow-x-auto rounded-[5px] border border-[#a8d5e8] bg-white px-[10px] py-[7px]">
            <table className="w-full min-w-[680px] border-collapse text-left text-[11px] text-[#29485a]">
              <thead><tr>
                <th className="w-[9%] border-b border-[#9daeb7] px-[9px] py-[10px]" aria-label="View details"></th>
                <th className="border-b border-[#9daeb7] px-[9px] py-[10px] font-semibold">Name</th>
                <th className="border-b border-[#9daeb7] px-[9px] py-[10px] font-semibold">Date and Time Created</th>
                {filter === 'dispatcher' && <th className="border-b border-[#9daeb7] px-[9px] py-[10px] font-semibold">Currently Assigned</th>}
                {filter === 'driver' && <th className="border-b border-[#9daeb7] px-[9px] py-[10px] font-semibold">Vehicle Plate Number</th>}
                {filter === 'all' && <th className="border-b border-[#9daeb7] px-[9px] py-[10px] font-semibold">Role</th>}
                <th className="border-b border-[#9daeb7] px-[9px] py-[10px] font-semibold">Account Status</th>
              </tr></thead>
              <tbody>
                {filteredUsers.map((user) => <tr className="border-b border-[#9daeb7] last:border-b-0" key={user.account_id}>
                  <td className="px-[9px] py-[9px]"><button className="grid h-7 w-7 cursor-pointer place-items-center rounded text-[#345365] hover:bg-[#eaf7fc]" onClick={() => setSelectedUser(user)} aria-label={`View ${displayName(user)} details`} title="View details"><ExpandIcon /></button></td>
                  <td className="px-[9px] py-[9px] font-medium">{displayName(user)}</td>
                  <td className="px-[9px] py-[9px]">{dateTime(user.created_on)}</td>
                  {filter === 'dispatcher' && <td className="px-[9px] py-[9px]">{user.current_assignment?.route?.destination || '—'}</td>}
                  {filter === 'driver' && <td className="px-[9px] py-[9px]">{user.vehicle?.plate_number || '—'}</td>}
                  {filter === 'all' && <td className="px-[9px] py-[9px] capitalize">{user.role}</td>}
                  <td className="px-[9px] py-[9px]"><StatusBadge status={user.status} /></td>
                </tr>)}
                {!loading && !filteredUsers.length && <tr><td colSpan="5" className="h-28 text-center text-[#718792]">{search ? 'No accounts match your search.' : 'No accounts found.'}</td></tr>}
                {loading && <tr><td colSpan="5" className="h-28 text-center text-[#718792]">Loading users…</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      {selectedUser && <UserDetailsModal user={selectedUser} onClose={() => setSelectedUser(null)} />}
      {createUserOpen && <CreateUserModal onClose={() => setCreateUserOpen(false)} onCreated={async (role) => { setCreateUserOpen(false); setNotice(`${role === 'driver' ? 'Driver' : 'Dispatcher'} account created. The phone number is the login username and temporary password.`); await refresh(); }} />}
    </div>
  );
}

function displayName(user) {
  const fullName = [user.personal?.first_name, user.personal?.last_name].filter(Boolean).join(' ');
  return fullName || user.username || user.account_code;
}

function StatusBadge({ status }) {
  const style = status === 'active' ? 'text-[#008b43]' : status === 'suspended' ? 'text-[#c17b00]' : 'text-[#c1363b]';
  return <span className={`inline-flex items-center gap-1.5 font-semibold capitalize ${style}`}><span className="h-[5px] w-[5px] rounded-full bg-current" />{status}</span>;
}

function UserDetailsModal({ user, onClose }) {
  const driver = user.role === 'driver';
  const trip = user.current_trip;
  return <div className="fixed inset-0 z-50 grid place-items-center bg-[#0c1f2a]/45 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="relative max-h-[90vh] w-full max-w-[650px] overflow-y-auto rounded-xl border border-[#d4e4eb] bg-white p-6 shadow-[0_18px_55px_rgba(10,44,63,0.2)] max-[600px]:p-4" role="dialog" aria-modal="true" aria-labelledby="user-detail-title">
      <button type="button" className="absolute right-4 top-3 grid h-8 w-8 cursor-pointer place-items-center rounded-full border-0 bg-transparent text-2xl text-[#506b77] hover:bg-[#edf6fa]" aria-label="Close details" onClick={onClose}>×</button>
      <span className="text-[10px] font-bold tracking-[.1em] text-[#0879ac]">{driver ? 'DRIVER ACCOUNT' : 'DISPATCHER ACCOUNT'}</span>
      <h2 id="user-detail-title" className="mb-1 mt-1 pr-10 text-[23px] font-bold text-[#173b4e]">{displayName(user)}</h2>
      <p className="mb-5 text-xs text-[#647c87]">{user.account_code} · <span className="capitalize">{user.status}</span></p>

      <DetailSection title="Personal and Account Details">
        <Detail label="Account username" value={user.username} />
        <Detail label="Email" value={user.email || user.personal?.email} />
        <Detail label="Role" value={capitalize(user.role)} />
        <Detail label="Account status" value={capitalize(user.status)} />
        <Detail label="Account created" value={dateTime(user.created_on)} />
        <Detail label="Last login" value={dateTime(user.last_login)} />
        {!driver && <>
          <Detail label="First name" value={user.personal?.first_name} />
          <Detail label="Last name" value={user.personal?.last_name} />
          <Detail label="Mobile number" value={user.personal?.contact_number} />
        </>}
        {driver && <>
          <Detail label="Driver ID" value={user.personal?.driver_id} />
          <Detail label="Mobile number" value={user.personal?.contact_number} />
          <Detail label="Driver’s license" value={user.personal?.license_num} />
          <Detail label="License expiry" value={dateOnly(user.personal?.license_expiry)} />
        </>}
      </DetailSection>

      {driver ? <>
        <DetailSection title="Associated Vehicle">
          {user.vehicle ? <>
            <Detail label="Plate number" value={user.vehicle.plate_number} />
            <Detail label="Body number" value={user.vehicle.body_number} />
            <Detail label="Vehicle type" value={user.vehicle.vehicle_type} />
            <Detail label="Body color" value={user.vehicle.body_color} />
            <Detail label="Vehicle condition" value={capitalize(user.vehicle.condition)} />
            <Detail label="Activity status" value={capitalize(user.vehicle.activity_status)} />
            <Detail label="Registration expiry" value={dateOnly(user.vehicle.registry_expiration)} />
          </> : <p className="mb-0 text-sm text-[#718792]">No associated vehicle.</p>}
        </DetailSection>
        <DetailSection title="Current Trip">
          {trip ? <>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-[#e9faf2] px-3 py-1 text-xs font-semibold text-[#008b43]"><span className="h-2 w-2 rounded-full bg-current" />Currently on trip</div>
            <Detail label="Trip ID" value={`#${trip.trip_id}`} />
            <Detail label="Direction" value={capitalize(trip.direction)} />
            <Detail label="Route" value={trip.route?.name || 'Route information unavailable'} />
            <Detail label="Trip started" value={dateTime(trip.started_at)} />
            {trip.vehicle && <Detail label="Trip vehicle" value={`${trip.vehicle.plate_number} · ${trip.vehicle.body_number}`} />}
            <div className="mt-4 border-t border-[#e3edf1] pt-4"><h3 className="mb-2 text-sm font-semibold text-[#294a5b]">Dispatch Ticket</h3>
              {trip.ticket ? <div className="grid gap-2 sm:grid-cols-2"><Detail label="Reference number" value={trip.ticket.reference} /><Detail label="Queue number" value={trip.ticket.queue_number} /><Detail label="Generated at" value={dateTime(trip.ticket.generated_at)} /><Detail label="Ticket status" value={trip.ticket.status} /></div> : <p className="mb-0 text-sm text-[#718792]">No ticket is linked to this trip.</p>}
            </div>
          </> : <div className="flex min-h-24 flex-col items-center justify-center text-center text-sm text-[#718792]"><EmptyTripIcon /><span className="mt-2">Driver is not currently on a trip.</span></div>}
        </DetailSection>
      </> : <DetailSection title="Current Dispatch Route">
        {user.current_assignment ? <>
          <Detail label="Assigned route" value={user.current_assignment.route?.name || 'Route details unavailable'} />
          <Detail label="Operating date" value={dateOnly(user.current_assignment.operating_date)} />
          <Detail label="Assignment opened" value={dateTime(user.current_assignment.opened_at)} />
        </> : <p className="mb-0 text-sm text-[#718792]">No active dispatch route is assigned today.</p>}
      </DetailSection>}

      <div className="mt-5 flex justify-end"><button className="rounded-md border-0 bg-[#e8f3f7] px-4 py-2 text-xs font-semibold text-[#34515f] hover:bg-[#dcecf2]" onClick={onClose}>Close</button></div>
    </section>
  </div>;
}

function CreateUserModal({ onClose, onCreated }) {
  const [step, setStep] = useState(1);
  const [role, setRole] = useState('driver');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [showTemporaryPassword, setShowTemporaryPassword] = useState(false);
  const [values, setValues] = useState({
    first_name: '', last_name: '', contact_number: '', email: '', license_num: '', license_expiry: '',
    plate_number: '', body_number: '', body_color: '#2684a8', vehicle_type: '', registry_expiration: '',
  });
  const setField = (event) => {
    const { name, value } = event.target;
    setValues((current) => ({ ...current, [name]: name === 'contact_number' ? value.replace(/\D/g, '').slice(0, 11) : value }));
  };
  const phoneError = values.contact_number && !/^\d{11}$/.test(values.contact_number) ? 'Phone number must be exactly 11 digits.' : '';
  const inputClass = 'mt-1 w-full rounded-md border border-[#becbd1] bg-white px-3 py-2 text-sm text-[#203f4f] outline-none focus:border-[#168dff]';
  const labelClass = 'block text-xs font-medium text-[#405f6d]';
  const validatePersonal = () => {
    if (!values.first_name.trim() || !values.last_name.trim()) return 'Enter the user’s first and last name.';
    if (values.first_name.trim().length > 50 || values.last_name.trim().length > 50) return 'Names must be 50 characters or fewer.';
    if (!/^\d{11}$/.test(values.contact_number)) return 'Phone number must be exactly 11 digits.';
    if (values.email.trim() && !/^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/.test(values.email.trim())) return 'Enter a valid email address.';
    if (role === 'driver') {
      if (!values.license_num.trim() || !values.license_expiry) return 'Driver’s license number and expiry are required.';
      if (!values.plate_number.trim() || !values.body_number.trim() || !values.vehicle_type.trim() || !values.registry_expiration) return 'Complete all vehicle fields.';
    }
    return '';
  };
  const create = async (event) => {
    event.preventDefault();
    setError('');
    const validationError = validatePersonal();
    if (validationError) { setError(validationError); setStep(1); return; }
    setBusy(true);
    try {
      const common = {
        first_name: values.first_name.trim(),
        last_name: values.last_name.trim(),
        contact_number: values.contact_number,
        email: values.email.trim() || undefined,
      };
      if (role === 'driver') {
        await createDriver({
          ...common,
          license_num: values.license_num.trim(),
          license_expiry: new Date(`${values.license_expiry}T00:00:00+08:00`).toISOString(),
          vehicle: {
            plate_number: values.plate_number.trim().toUpperCase(),
            body_number: values.body_number.trim(),
            body_color: values.body_color,
            vehicle_type: values.vehicle_type.trim(),
            registry_expiration: new Date(`${values.registry_expiration}T00:00:00+08:00`).toISOString(),
          },
        });
      } else {
        await createDispatcher(common);
      }
      await onCreated(role);
    } catch (requestError) {
      const detail = requestError?.payload?.detail;
      setError(Array.isArray(detail) ? detail.map((item) => item.msg).join(', ') : detail || requestError.message || 'Could not create the account.');
    } finally {
      setBusy(false);
    }
  };

  return <div className="fixed inset-0 z-50 grid place-items-center bg-[#0c1f2a]/45 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onClose(); }}>
    <section className="max-h-[92vh] w-full max-w-[620px] overflow-y-auto rounded-xl border border-[#d4e4eb] bg-white shadow-[0_18px_55px_rgba(10,44,63,0.2)]" role="dialog" aria-modal="true" aria-labelledby="create-user-title">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-[#e1edf1] bg-white px-6 py-4">
        <div><h2 id="create-user-title" className="m-0 text-lg font-bold text-[#173b4e]">Create New User</h2><p className="mb-0 mt-1 text-xs text-[#718792]">Step {step} of 2 · {step === 1 ? 'Personal Details' : 'Account Details'}</p></div>
        <button type="button" disabled={busy} className="grid h-8 w-8 cursor-pointer place-items-center rounded-full border-0 bg-[#f2f8fa] text-xl text-[#506b77] disabled:opacity-50" onClick={onClose} aria-label="Close">×</button>
      </header>
      <form onSubmit={create} className="space-y-4 p-6 max-[600px]:p-4">
        {error && <div role="alert" className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>}
        {step === 1 ? <>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className={labelClass}>First name<input className={inputClass} name="first_name" value={values.first_name} onChange={setField} autoComplete="given-name" maxLength={50} required /></label>
            <label className={labelClass}>Last name<input className={inputClass} name="last_name" value={values.last_name} onChange={setField} autoComplete="family-name" maxLength={50} required /></label>
            <label className={labelClass}>Phone number<input className={`${inputClass} ${phoneError ? 'border-red-400' : ''}`} name="contact_number" value={values.contact_number} onChange={setField} inputMode="numeric" autoComplete="tel" placeholder="09XXXXXXXXX" required aria-invalid={Boolean(phoneError)} />{phoneError && <span className="mt-1 block text-[11px] text-red-600">{phoneError}</span>}</label>
            <label className={labelClass}>Email <span className="font-normal text-[#82949c]">(optional)</span><input className={inputClass} type="email" name="email" value={values.email} onChange={setField} autoComplete="email" /></label>
          </div>
          <label className={labelClass}>Account role<select className={inputClass} value={role} onChange={(event) => setRole(event.target.value)}><option value="driver">Driver</option><option value="dispatcher">Dispatcher</option></select></label>
          {role === 'driver' && <div className="space-y-4 rounded-lg border border-[#d7e8ef] p-4">
            <h3 className="m-0 text-sm font-bold text-[#294a5b]">Driver and Vehicle Details</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className={labelClass}>Driver’s license number<input className={inputClass} name="license_num" value={values.license_num} onChange={setField} maxLength={13} required /></label>
              <label className={labelClass}>License expiry<input className={inputClass} type="date" name="license_expiry" value={values.license_expiry} onChange={setField} required /></label>
              <label className={labelClass}>Plate number<input className={inputClass} name="plate_number" value={values.plate_number} onChange={setField} maxLength={8} required /></label>
              <label className={labelClass}>Body number<input className={inputClass} name="body_number" value={values.body_number} onChange={setField} maxLength={10} required /></label>
              <label className={labelClass}>Vehicle type<input className={inputClass} name="vehicle_type" value={values.vehicle_type} onChange={setField} placeholder="e.g. Multicab" required /></label>
              <label className={labelClass}>Body color<div className="mt-1 flex h-[38px] items-center gap-2 rounded-md border border-[#becbd1] px-2"><input type="color" name="body_color" value={values.body_color} onChange={setField} className="h-7 w-9 cursor-pointer border-0 bg-transparent p-0" /><span className="text-xs text-[#405f6d]">{values.body_color.toUpperCase()}</span></div></label>
              <label className={`${labelClass} sm:col-span-2`}>Vehicle registration expiry<input className={inputClass} type="date" name="registry_expiration" value={values.registry_expiration} onChange={setField} required /></label>
            </div>
            <p className="m-0 text-[11px] leading-relaxed text-[#718792]">The driver account and vehicle are saved together. If either record cannot be created, neither is saved.</p>
          </div>}
          <div className="flex justify-end gap-2 pt-1"><button type="button" className="rounded-md border-0 bg-[#168dff] px-5 py-2 text-sm font-semibold text-white hover:bg-[#0876db]" onClick={() => { const validationError = validatePersonal(); if (validationError) setError(validationError); else { setError(''); setStep(2); } }}>Next</button></div>
        </> : <>
          <div className="rounded-lg bg-[#f4f9fb] p-4"><h3 className="mb-2 mt-0 text-sm font-bold text-[#294a5b]">Account credentials</h3><p className="mb-4 mt-0 text-xs leading-relaxed text-[#647c87]">The phone number is set as both the login username and the temporary password. These values are fixed for this account setup.</p>
            <div className="grid gap-3 sm:grid-cols-2"><label className={labelClass}>Login username<input className={`${inputClass} bg-[#f5f8f9]`} value={values.contact_number} readOnly /></label><label className={labelClass}>Temporary password<span className="mt-1 flex rounded-md border border-[#becbd1] bg-[#f5f8f9] focus-within:border-[#168dff]"><input className="w-full min-w-0 bg-transparent px-3 py-2 text-sm text-[#203f4f] outline-none" type={showTemporaryPassword ? 'text' : 'password'} value={values.contact_number} readOnly /><button type="button" className="shrink-0 cursor-pointer border-0 bg-transparent px-3 text-xs font-semibold text-[#0879ac] hover:text-[#075d84]" onClick={() => setShowTemporaryPassword((visible) => !visible)} aria-label={showTemporaryPassword ? 'Hide temporary password' : 'Show temporary password'}>{showTemporaryPassword ? 'Hide' : 'Show'}</button></span></label></div>
            <p className="mb-0 mt-3 text-[11px] text-[#718792]">The account will require a password change after the first login.</p>
          </div>
          <div className="flex justify-between gap-2 pt-1"><button type="button" disabled={busy} className="rounded-md border-0 bg-[#edf4f7] px-4 py-2 text-sm font-semibold text-[#34515f]" onClick={() => { setError(''); setStep(1); }}>Back</button><button type="submit" disabled={busy} className="rounded-md border-0 bg-[#168dff] px-5 py-2 text-sm font-semibold text-white hover:bg-[#0876db] disabled:cursor-wait disabled:opacity-60">{busy ? 'Creating…' : 'Create User'}</button></div>
        </>}
      </form>
    </section>
  </div>;
}

function DetailSection({ title, children }) {
  return <section className="mb-4 rounded-lg border border-[#d7e8ef] p-4 max-[600px]:p-3"><h3 className="mb-3 text-sm font-bold text-[#294a5b]">{title}</h3><div className="grid gap-x-6 sm:grid-cols-2">{children}</div></section>;
}

function Detail({ label, value }) {
  return <div className="mb-2 min-w-0"><dt className="text-[10px] text-[#748892]">{label}</dt><dd className="m-0 break-words text-xs font-medium text-[#29485a]">{value || '—'}</dd></div>;
}

function capitalize(value) { return value ? value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()) : '—'; }
function CalendarIcon() { return <svg className="h-[15px] w-[15px]" viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="3.5" y="5" width="17" height="15.5" rx="2" stroke="currentColor" strokeWidth="1.5"/><path d="M7.5 3v4M16.5 3v4M4 9h16" stroke="currentColor" strokeWidth="1.5"/></svg>; }
function SearchIcon() { return <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.8" stroke="currentColor" strokeWidth="1.6"/><path d="m16 16 5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>; }
function EditIcon() { return <svg className="h-4 w-4" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="m12.8 4.2 3 3M4 16l3.2-.7 8.9-8.9a2.1 2.1 0 0 0-3-3l-8.9 8.9L4 16Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/></svg>; }
function ExpandIcon() { return <svg className="h-[15px] w-[15px]" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M7 3H3v4m10-4h4v4M3 13v4h4m10-4v4h-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>; }
function EmptyTripIcon() { return <svg className="h-8 w-8 text-[#91a8b1]" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M3 14h18M5 14l1.4-5h11.2l1.4 5M5 14v4m14-4v4M7 18h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><circle cx="7" cy="17" r="1" fill="currentColor"/><circle cx="17" cy="17" r="1" fill="currentColor"/></svg>; }

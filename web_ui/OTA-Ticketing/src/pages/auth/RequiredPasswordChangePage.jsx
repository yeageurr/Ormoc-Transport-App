import { useState } from 'react';
import { changePassword } from '../../api/auth.api';

const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
const passwordHint = 'Use at least 8 characters, including uppercase and lowercase letters and a number.';

export default function RequiredPasswordChangePage({ onComplete, onLogout }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    if (!passwordPattern.test(newPassword)) { setError(passwordHint); return; }
    if (newPassword !== confirmPassword) { setError('New password and confirmation do not match.'); return; }
    setSaving(true);
    try {
      await changePassword(currentPassword, newPassword, confirmPassword);
      onComplete();
    } catch (requestError) {
      setError(requestError.message || 'Could not update your password.');
    } finally {
      setSaving(false);
    }
  };

  const field = 'mt-1 w-full rounded-md border border-[#becbd1] bg-white px-3 py-2.5 text-sm text-[#203f4f] outline-none focus:border-[#168dff]';
  return <main className="grid min-h-screen place-items-center bg-[#A9E4FF] p-4 text-[#18364a]">
    <section className="w-full max-w-md rounded-xl border border-[#d2e6ef] bg-white p-7 shadow-lg max-[600px]:p-5">
      <p className="mb-2 text-[10px] font-bold tracking-[.12em] text-[#0879ac]">ACCOUNT SETUP</p>
      <h1 className="mb-2 mt-0 text-2xl font-bold">Set your password</h1>
      <p className="mb-5 text-sm leading-relaxed text-[#647c87]">You must replace your temporary password before accessing the ticketing portal. {passwordHint}</p>
      <form className="space-y-4" onSubmit={submit}>
        <label className="block text-xs font-semibold text-[#405f6d]">Temporary password<input className={field} type="password" autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} required /></label>
        <label className="block text-xs font-semibold text-[#405f6d]">New password<input className={field} type="password" autoComplete="new-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} required /></label>
        <label className="block text-xs font-semibold text-[#405f6d]">Confirm new password<input className={field} type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required /></label>
        {error && <p className="m-0 rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700" role="alert">{error}</p>}
        <button type="submit" disabled={saving} className="w-full cursor-pointer rounded-md border-0 bg-[#168dff] px-4 py-3 text-sm font-semibold text-white hover:bg-[#0876db] disabled:cursor-wait disabled:opacity-60">{saving ? 'Saving…' : 'Set password and continue'}</button>
      </form>
      <button type="button" disabled={saving} className="mt-3 w-full cursor-pointer border-0 bg-transparent py-2 text-sm font-medium text-[#526f7b] hover:text-[#173b4e]" onClick={onLogout}>Log out</button>
    </section>
  </main>;
}

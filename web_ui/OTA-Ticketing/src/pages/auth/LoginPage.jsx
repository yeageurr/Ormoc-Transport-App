import { useState } from 'react';
import BrandHeader from '../../components/auth/BrandHeader';
import { useAuth } from '../../context/AuthContext';

export default function LoginPage({ onForgotPassword, onSignedIn }) {
  const { signIn } = useAuth();
  const [identity, setIdentity] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await signIn(identity.trim(), password);
      onSignedIn();
    } catch (loginError) {
      setError(loginError.message || 'Unable to sign in. Check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell>
      <BrandHeader />
      <form onSubmit={handleSubmit} className="mt-12 w-full max-w-md rounded-lg bg-white/45 p-5 sm:p-7">
        <Field label="Email or Phone" icon="mail">
          <input className="w-full min-w-0 border-0 bg-transparent py-[10px] pl-[42px] pr-3 text-sm text-[#182428] outline-none placeholder:text-[#71828a]" autoComplete="username" value={identity} onChange={(event) => setIdentity(event.target.value)} placeholder="email@example.com or phone" required />
        </Field>
        <Field label="Password" icon="key">
          <input className="w-full min-w-0 border-0 bg-transparent py-[10px] pl-[42px] pr-10 text-sm text-[#182428] outline-none placeholder:text-[#71828a]" autoComplete="current-password" type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter your password" required />
          <button type="button" className="absolute right-[10px] top-1/2 flex -translate-y-1/2 cursor-pointer border-0 bg-transparent p-1 text-[#263b42]" onClick={() => setShowPassword((shown) => !shown)} aria-label={showPassword ? 'Hide password' : 'Show password'}>
            {showPassword ? <EyeOff /> : <Eye />}
          </button>
        </Field>
        {error ? <p role="alert" className="mb-3 rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}
        <button className="flex min-h-11 w-full cursor-pointer items-center justify-center rounded-md border border-[#00ce79] bg-[#00ed85] text-[15px] font-semibold text-[#08120e] transition hover:bg-[#00d978] active:translate-y-px disabled:cursor-wait disabled:opacity-65" type="submit" disabled={submitting}>
          {submitting ? 'Signing in…' : 'Login'}
        </button>
        <button className="mt-3 w-full cursor-pointer border-0 bg-transparent text-[13px] font-medium text-[#142126]" type="button" onClick={onForgotPassword}>Forgot Password?</button>
      </form>
    </AuthShell>
  );
}

export function AuthShell({ children }) {
  return <main className="grid min-h-screen place-items-center bg-[#a8e2f8] px-5 py-10"><div className="flex w-full max-w-[560px] flex-col items-center">{children}</div></main>;
}

function Field({ label, icon, children }) {
  return (
    <label className="mb-6 block text-[13px] font-medium text-[#101719] sm:text-sm">
      <span className="mb-[7px] block">{label}</span>
      <span className="relative flex min-h-11 items-center rounded-md border border-[#33464c] text-[#1c3037] focus-within:border-[#0284c7] focus-within:outline focus-within:outline-2 focus-within:outline-[#0ea5e9]/30">
        <span className="absolute left-[11px] top-1/2 grid -translate-y-1/2 text-[#263b42]" aria-hidden="true">{icon === 'mail' ? <Mail /> : <Key />}</span>
        {children}
      </span>
    </label>
  );
}

function Mail() { return <svg viewBox="0 0 24 24" fill="none" className="size-5"><rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.6"/><path d="m4 7 8 6 8-6" stroke="currentColor" strokeWidth="1.6"/></svg>; }
function Key() { return <svg viewBox="0 0 24 24" fill="none" className="size-5"><circle cx="8" cy="15" r="4" stroke="currentColor" strokeWidth="1.6"/><path d="m11 12 8-8 2 2-2 2 2 2-3 3-2-2-3 3" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/></svg>; }
function Eye() { return <svg viewBox="0 0 24 24" fill="none" className="size-5"><path d="M2.5 12s3.3-6 9.5-6 9.5 6 9.5 6-3.3 6-9.5 6-9.5-6-9.5-6Z" stroke="currentColor" strokeWidth="1.6"/><circle cx="12" cy="12" r="2.5" stroke="currentColor" strokeWidth="1.6"/></svg>; }
function EyeOff() { return <svg viewBox="0 0 24 24" fill="none" className="size-5"><path d="m3 3 18 18M10.6 6.2A10 10 0 0 1 12 6c6.2 0 9.5 6 9.5 6a15 15 0 0 1-3 3.7M6.2 6.8C3.8 8.3 2.5 12 2.5 12s3.3 6 9.5 6c.9 0 1.7-.1 2.4-.4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/><path d="a3 3 0 0 0 4.2-4.2" stroke="currentColor" strokeWidth="1.6"/></svg>; }

import { useState } from 'react';
import BrandHeader from '../../components/auth/BrandHeader';
import { useAuth } from '../../context/AuthContext';

export default function LoginPage({ onForgotPassword, onSignedIn }) {
  const { signIn, signOut } = useAuth();
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
      const result = await signIn(identity.trim(), password);
      if (String(result.user?.role).toLowerCase() !== 'ticketing_officer') {
        await signOut();
        setError('This portal is for ticketing officer accounts.');
        return;
      }
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
          <input autoComplete="username" value={identity} onChange={(event) => setIdentity(event.target.value)} placeholder="email@example.com or phone" required />
        </Field>
        <Field label="Password" icon="key">
          <input autoComplete="current-password" type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter your password" required />
          <button type="button" className="password-toggle" onClick={() => setShowPassword((shown) => !shown)} aria-label={showPassword ? 'Hide password' : 'Show password'}>
            {showPassword ? <EyeOff /> : <Eye />}
          </button>
        </Field>
        {error ? <p role="alert" className="mb-3 rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}
        <button className="primary-button" type="submit" disabled={submitting}>
          {submitting ? 'Signing in…' : 'Login'}
        </button>
        <button className="text-button mt-3 w-full" type="button" onClick={onForgotPassword}>Forgot Password?</button>
      </form>
    </AuthShell>
  );
}

export function AuthShell({ children }) {
  return <main className="auth-page"><div className="auth-content">{children}</div></main>;
}

function Field({ label, icon, children }) {
  return (
    <label className="auth-field">
      <span>{label}</span>
      <span className="auth-input-wrap">
        <span className="field-icon" aria-hidden="true">{icon === 'mail' ? <Mail /> : <Key />}</span>
        {children}
      </span>
    </label>
  );
}

function Mail() { return <svg viewBox="0 0 24 24" fill="none" className="size-5"><rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.6"/><path d="m4 7 8 6 8-6" stroke="currentColor" strokeWidth="1.6"/></svg>; }
function Key() { return <svg viewBox="0 0 24 24" fill="none" className="size-5"><circle cx="8" cy="15" r="4" stroke="currentColor" strokeWidth="1.6"/><path d="m11 12 8-8 2 2-2 2 2 2-3 3-2-2-3 3" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/></svg>; }
function Eye() { return <svg viewBox="0 0 24 24" fill="none" className="size-5"><path d="M2.5 12s3.3-6 9.5-6 9.5 6 9.5 6-3.3 6-9.5 6-9.5-6-9.5-6Z" stroke="currentColor" strokeWidth="1.6"/><circle cx="12" cy="12" r="2.5" stroke="currentColor" strokeWidth="1.6"/></svg>; }
function EyeOff() { return <svg viewBox="0 0 24 24" fill="none" className="size-5"><path d="m3 3 18 18M10.6 6.2A10 10 0 0 1 12 6c6.2 0 9.5 6 9.5 6a15 15 0 0 1-3 3.7M6.2 6.8C3.8 8.3 2.5 12 2.5 12s3.3 6 9.5 6c.9 0 1.7-.1 2.4-.4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/><path d="a3 3 0 0 0 4.2-4.2" stroke="currentColor" strokeWidth="1.6"/></svg>; }

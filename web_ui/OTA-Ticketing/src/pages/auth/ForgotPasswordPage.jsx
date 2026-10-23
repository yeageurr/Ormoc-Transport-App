import { useEffect, useRef, useState } from 'react';
import BrandHeader from '../../components/auth/BrandHeader';
import { completePasswordReset, requestPasswordResetCode, resendPasswordResetCode, verifyPasswordResetCode } from '../../api/auth.api';
import { AuthShell } from './LoginPage';

export default function ForgotPasswordPage({ onBackToLogin }) {
  const [step, setStep] = useState('email');
  const [email, setEmail] = useState('');
  const [digits, setDigits] = useState(Array(6).fill(''));
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const inputRefs = useRef([]);

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const timer = window.setTimeout(() => setCooldown((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  async function sendCode(event) {
    event.preventDefault();
    setBusy(true); setError(''); setMessage('');
    try {
      await requestPasswordResetCode(email.trim());
      setStep('otp'); setCooldown(60); setMessage('A 6-digit verification code was sent to your email.');
    } catch (requestError) {
      setError(requestError.message || 'Could not send the verification code.');
    } finally { setBusy(false); }
  }

  async function resendCode() {
    if (cooldown || busy) return;
    setBusy(true); setError(''); setMessage('');
    try {
      await resendPasswordResetCode(email.trim());
      setDigits(Array(6).fill('')); setCooldown(60); setMessage('A new verification code was sent.');
      inputRefs.current[0]?.focus();
    } catch (requestError) { setError(requestError.message || 'Could not resend the code.'); }
    finally { setBusy(false); }
  }

  async function verifyCode(event) {
    event.preventDefault();
    const code = digits.join('');
    if (code.length !== 6) { setError('Enter all 6 digits.'); return; }
    setBusy(true); setError(''); setMessage('');
    try {
      const result = await verifyPasswordResetCode(email.trim(), code);
      setResetToken(result.reset_token); setStep('password');
    } catch (verifyError) { setError(verifyError.message || 'That code could not be verified.'); }
    finally { setBusy(false); }
  }

  async function savePassword(event) {
    event.preventDefault();
    setError(''); setMessage('');
    if (newPassword !== confirmPassword) { setError('Passwords do not match.'); return; }
    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(newPassword)) {
      setError('Use at least 8 characters with uppercase, lowercase, and a number.'); return;
    }
    setBusy(true);
    try {
      await completePasswordReset(resetToken, newPassword, confirmPassword);
      setStep('success');
    } catch (saveError) { setError(saveError.message || 'Could not update your password.'); }
    finally { setBusy(false); }
  }

  function updateDigit(index, value) {
    const digit = value.replace(/\D/g, '').slice(-1);
    setDigits((previous) => previous.map((item, i) => i === index ? digit : item));
    if (digit && index < 5) inputRefs.current[index + 1]?.focus();
  }

  function handleDigitKey(index, event) {
    if (event.key === 'Backspace' && !digits[index] && index > 0) inputRefs.current[index - 1]?.focus();
  }

  return (
    <AuthShell>
      <BrandHeader compact={step === 'otp'} />
      <section className="auth-card mt-8 w-full max-w-md">
        {step === 'email' ? (
          <form onSubmit={sendCode}>
            <h1>Forgot your password?</h1>
            <p className="auth-description">Enter the email address linked to your ticketing officer account.</p>
            <label className="auth-field">
              <span>Enter your email</span>
              <span className="auth-input-wrap"><span className="field-icon"><Mail /></span><input autoComplete="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="email@example.com" required /></span>
            </label>
            <Feedback error={error} message={message} />
            <button className="primary-button mt-2" type="submit" disabled={busy}>{busy ? 'Sending…' : 'Send OTP'}</button>
            <button className="text-button mt-3 w-full" type="button" onClick={onBackToLogin}>Back to Login</button>
          </form>
        ) : null}

        {step === 'otp' ? (
          <form onSubmit={verifyCode}>
            <h1>Verify Email Address</h1>
            <p className="auth-description">Enter the 6-digit OTP sent to your email.</p>
            <div className="otp-inputs" role="group" aria-label="6-digit verification code">
              {digits.map((digit, index) => (
                <input
                  key={index}
                  ref={(node) => { inputRefs.current[index] = node; }}
                  aria-label={`OTP digit ${index + 1}`}
                  autoComplete={index === 0 ? 'one-time-code' : 'off'}
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(event) => updateDigit(index, event.target.value)}
                  onKeyDown={(event) => handleDigitKey(index, event)}
                  onPaste={(event) => {
                    const pasted = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6).split('');
                    if (pasted.length) { event.preventDefault(); setDigits(Array.from({ length: 6 }, (_, i) => pasted[i] || '')); inputRefs.current[Math.min(pasted.length, 5)]?.focus(); }
                  }}
                />
              ))}
            </div>
            <Feedback error={error} message={message} />
            <button className="primary-button mt-5" type="submit" disabled={busy}>{busy ? 'Verifying…' : 'Verify'}</button>
            <button className="text-button mt-3 w-full" type="button" disabled={cooldown > 0 || busy} onClick={() => void resendCode()}>
              {cooldown > 0 ? `Resend OTP in ${cooldown}s` : 'Resend OTP'}
            </button>
            <button className="text-button mt-1 w-full text-slate-500" type="button" onClick={() => { setStep('email'); setError(''); setMessage(''); }}>Change email</button>
          </form>
        ) : null}

        {step === 'password' ? (
          <form onSubmit={savePassword}>
            <h1>Set Your New Password</h1>
            <p className="auth-description">Make sure you can remember it next time.</p>
            <label className="auth-field">
              <span>New Password</span>
              <span className="auth-input-wrap"><span className="field-icon"><Key /></span><input autoComplete="new-password" type={showPassword ? 'text' : 'password'} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} required /><button type="button" className="password-toggle" onClick={() => setShowPassword((shown) => !shown)} aria-label="Toggle password visibility">{showPassword ? 'Hide' : 'Show'}</button></span>
            </label>
            <label className="auth-field">
              <span>Confirm New Password</span>
              <span className="auth-input-wrap"><span className="field-icon"><Key /></span><input autoComplete="new-password" type={showPassword ? 'text' : 'password'} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required /></span>
            </label>
            <p className="password-guidance">At least 8 characters, including uppercase, lowercase, and a number.</p>
            <Feedback error={error} message={message} />
            <button className="primary-button mt-4" type="submit" disabled={busy}>{busy ? 'Updating…' : 'Confirm and Login'}</button>
          </form>
        ) : null}

        {step === 'success' ? (
          <div className="text-center">
            <div className="success-mark" aria-hidden="true">✓</div>
            <h1>Password Updated</h1>
            <p className="auth-description">Your password was changed. Sign in with your new password.</p>
            <button className="primary-button mt-5" type="button" onClick={onBackToLogin}>Back to Login</button>
          </div>
        ) : null}
      </section>
    </AuthShell>
  );
}

function Feedback({ error, message }) {
  return <>{error ? <p role="alert" className="feedback-error">{error}</p> : null}{message ? <p role="status" className="feedback-message">{message}</p> : null}</>;
}
function Mail() { return <svg viewBox="0 0 24 24" fill="none" className="size-5"><rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.6"/><path d="m4 7 8 6 8-6" stroke="currentColor" strokeWidth="1.6"/></svg>; }
function Key() { return <svg viewBox="0 0 24 24" fill="none" className="size-5"><circle cx="8" cy="15" r="4" stroke="currentColor" strokeWidth="1.6"/><path d="m11 12 8-8 2 2-2 2 2 2-3 3-2-2-3 3" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/></svg>; }

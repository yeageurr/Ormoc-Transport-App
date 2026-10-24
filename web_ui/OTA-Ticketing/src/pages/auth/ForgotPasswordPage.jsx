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
      <section className="mt-8 w-full max-w-md rounded-md bg-white/40 px-[15px] py-[27px] sm:px-4 sm:py-7">
        {step === 'email' ? (
          <form onSubmit={sendCode}>
            <h1 className="m-0 text-center text-xl font-semibold text-[#101719]">Forgot your password?</h1>
            <p className="my-4 mb-[25px] text-center text-sm leading-relaxed text-[#20292d]">Enter the email address linked to your ticketing officer account.</p>
            <label className="mb-6 block text-[13px] font-medium text-[#101719] sm:text-sm">
              <span className="mb-[7px] block">Enter your email</span>
              <span className="relative flex min-h-11 items-center rounded-md border border-[#33464c] text-[#1c3037] focus-within:border-[#0284c7] focus-within:outline focus-within:outline-2 focus-within:outline-[#0ea5e9]/30"><span className="absolute left-[11px] top-1/2 grid -translate-y-1/2 text-[#263b42]"><Mail /></span><input className="w-full min-w-0 border-0 bg-transparent py-[10px] pl-[42px] pr-3 text-sm text-[#182428] outline-none placeholder:text-[#71828a]" autoComplete="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="email@example.com" required /></span>
            </label>
            <Feedback error={error} message={message} />
            <button className="mt-2 flex min-h-11 w-full cursor-pointer items-center justify-center rounded-md border border-[#00ce79] bg-[#00ed85] text-[15px] font-semibold text-[#08120e] transition hover:bg-[#00d978] disabled:cursor-wait disabled:opacity-65" type="submit" disabled={busy}>{busy ? 'Sending…' : 'Send OTP'}</button>
            <button className="mt-3 w-full cursor-pointer border-0 bg-transparent text-[13px] font-medium text-[#142126]" type="button" onClick={onBackToLogin}>Back to Login</button>
          </form>
        ) : null}

        {step === 'otp' ? (
          <form onSubmit={verifyCode}>
            <h1 className="m-0 text-center text-xl font-semibold text-[#101719]">Verify Email Address</h1>
            <p className="my-4 mb-[25px] text-center text-sm leading-relaxed text-[#20292d]">Enter the 6-digit OTP sent to your email.</p>
            <div className="flex justify-center gap-[clamp(5px,2vw,11px)]" role="group" aria-label="6-digit verification code">
              {digits.map((digit, index) => (
                <input
                  key={index}
                  ref={(node) => { inputRefs.current[index] = node; }}
                  aria-label={`OTP digit ${index + 1}`}
                  className="h-16 w-[clamp(38px,12vw,54px)] rounded-md border border-[#344950] bg-transparent text-center text-[25px] outline-none focus:border-[#0284c7] focus:outline focus:outline-2 focus:outline-[#0ea5e9]/30"
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
            <button className="mt-5 flex min-h-11 w-full cursor-pointer items-center justify-center rounded-md border border-[#00ce79] bg-[#00ed85] text-[15px] font-semibold text-[#08120e] transition hover:bg-[#00d978] disabled:cursor-wait disabled:opacity-65" type="submit" disabled={busy}>{busy ? 'Verifying…' : 'Verify'}</button>
            <button className="mt-3 w-full cursor-pointer border-0 bg-transparent text-[13px] font-medium text-[#142126] disabled:cursor-default disabled:text-[#65747a]" type="button" disabled={cooldown > 0 || busy} onClick={() => void resendCode()}>
              {cooldown > 0 ? `Resend OTP in ${cooldown}s` : 'Resend OTP'}
            </button>
            <button className="mt-1 w-full cursor-pointer border-0 bg-transparent text-[13px] font-medium text-slate-500" type="button" onClick={() => { setStep('email'); setError(''); setMessage(''); }}>Change email</button>
          </form>
        ) : null}

        {step === 'password' ? (
          <form onSubmit={savePassword}>
            <h1 className="m-0 text-center text-xl font-semibold text-[#101719]">Set Your New Password</h1>
            <p className="my-4 mb-[25px] text-center text-sm leading-relaxed text-[#20292d]">Make sure you can remember it next time.</p>
            <label className="mb-6 block text-[13px] font-medium text-[#101719] sm:text-sm">
              <span className="mb-[7px] block">New Password</span>
              <span className="relative flex min-h-11 items-center rounded-md border border-[#33464c] text-[#1c3037] focus-within:border-[#0284c7] focus-within:outline focus-within:outline-2 focus-within:outline-[#0ea5e9]/30"><span className="absolute left-[11px] top-1/2 grid -translate-y-1/2 text-[#263b42]"><Key /></span><input className="w-full min-w-0 border-0 bg-transparent py-[10px] pl-[42px] pr-14 text-sm text-[#182428] outline-none" autoComplete="new-password" type={showPassword ? 'text' : 'password'} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} required /><button type="button" className="absolute right-[10px] top-1/2 flex -translate-y-1/2 cursor-pointer border-0 bg-transparent p-1 text-[#263b42]" onClick={() => setShowPassword((shown) => !shown)} aria-label="Toggle password visibility">{showPassword ? 'Hide' : 'Show'}</button></span>
            </label>
            <label className="mb-6 block text-[13px] font-medium text-[#101719] sm:text-sm">
              <span className="mb-[7px] block">Confirm New Password</span>
              <span className="relative flex min-h-11 items-center rounded-md border border-[#33464c] text-[#1c3037] focus-within:border-[#0284c7] focus-within:outline focus-within:outline-2 focus-within:outline-[#0ea5e9]/30"><span className="absolute left-[11px] top-1/2 grid -translate-y-1/2 text-[#263b42]"><Key /></span><input className="w-full min-w-0 border-0 bg-transparent py-[10px] pl-[42px] pr-3 text-sm text-[#182428] outline-none" autoComplete="new-password" type={showPassword ? 'text' : 'password'} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required /></span>
            </label>
            <p className="-mt-[15px] mb-5 text-[11px] text-[#526167]">At least 8 characters, including uppercase, lowercase, and a number.</p>
            <Feedback error={error} message={message} />
            <button className="mt-4 flex min-h-11 w-full cursor-pointer items-center justify-center rounded-md border border-[#00ce79] bg-[#00ed85] text-[15px] font-semibold text-[#08120e] transition hover:bg-[#00d978] disabled:cursor-wait disabled:opacity-65" type="submit" disabled={busy}>{busy ? 'Updating…' : 'Confirm and Login'}</button>
          </form>
        ) : null}

        {step === 'success' ? (
          <div className="text-center">
            <div className="mx-auto mb-[17px] grid h-[54px] w-[54px] place-items-center rounded-full bg-[#00b981] text-[30px] text-white" aria-hidden="true">✓</div>
            <h1 className="m-0 text-center text-xl font-semibold text-[#101719]">Password Updated</h1>
            <p className="my-4 mb-[25px] text-center text-sm leading-relaxed text-[#20292d]">Your password was changed. Sign in with your new password.</p>
            <button className="mt-5 flex min-h-11 w-full cursor-pointer items-center justify-center rounded-md border border-[#00ce79] bg-[#00ed85] text-[15px] font-semibold text-[#08120e] transition hover:bg-[#00d978]" type="button" onClick={onBackToLogin}>Back to Login</button>
          </div>
        ) : null}
      </section>
    </AuthShell>
  );
}

function Feedback({ error, message }) {
  return <>{error ? <p role="alert" className="-mb-3 -mt-[9px] rounded-[5px] bg-[#fff0f0] px-[10px] py-[9px] text-xs leading-relaxed text-[#a62828]">{error}</p> : null}{message ? <p role="status" className="-mb-3 -mt-[9px] rounded-[5px] bg-[#eafaf3] px-[10px] py-[9px] text-xs leading-relaxed text-[#176743]">{message}</p> : null}</>;
}
function Mail() { return <svg viewBox="0 0 24 24" fill="none" className="size-5"><rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.6"/><path d="m4 7 8 6 8-6" stroke="currentColor" strokeWidth="1.6"/></svg>; }
function Key() { return <svg viewBox="0 0 24 24" fill="none" className="size-5"><circle cx="8" cy="15" r="4" stroke="currentColor" strokeWidth="1.6"/><path d="m11 12 8-8 2 2-2 2 2 2-3 3-2-2-3 3" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/></svg>; }

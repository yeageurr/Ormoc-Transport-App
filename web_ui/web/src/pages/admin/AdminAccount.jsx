import { useEffect, useState } from "react";
import { AtSign, CheckCircle2, CircleUserRound, KeyRound, Mail, ShieldCheck, X } from "lucide-react";

import {
  requestAdminEmailChange,
  resendAdminEmailChangeCode,
  verifyAdminEmailChange,
} from "../../api/authAPI";
import ChangePasswordModal from "../../components/modals/ChangePasswordModal";
import setTitle from "../../components/pageTitle";
import { useAuth } from "../../context/AuthContext";

function displayRole(role) {
  if (!role) return "Administrator";
  return role.toLowerCase().replaceAll("_", " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

function EmailChangeModal({ onClose, onComplete }) {
  const [step, setStep] = useState("details");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [resendAvailableAt, setResendAvailableAt] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(0);

  useEffect(() => {
    if (!resendAvailableAt) return undefined;
    const updateCountdown = () => setSecondsLeft(Math.max(0, Math.ceil((resendAvailableAt - Date.now()) / 1000)));
    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);
    return () => clearInterval(timer);
  }, [resendAvailableAt]);

  const handleRequestCode = async (event) => {
    event.preventDefault();
    setError("");
    setNotice("");
    setBusy(true);
    try {
      await requestAdminEmailChange(currentPassword, newEmail.trim());
      setStep("verification");
      setResendAvailableAt(Date.now() + 60_000);
      setNotice(`A six-digit code was sent to ${newEmail.trim()}.`);
    } catch (requestError) {
      setError(requestError.message || "Could not send the verification code.");
    } finally {
      setBusy(false);
    }
  };

  const handleVerify = async (event) => {
    event.preventDefault();
    setError("");
    setNotice("");
    setBusy(true);
    try {
      await verifyAdminEmailChange(code);
      await onComplete();
      onClose();
    } catch (verifyError) {
      setError(verifyError.message || "Could not verify the code.");
    } finally {
      setBusy(false);
    }
  };

  const handleResend = async () => {
    setError("");
    setNotice("");
    setBusy(true);
    try {
      await resendAdminEmailChangeCode();
      setResendAvailableAt(Date.now() + 60_000);
      setNotice(`A new code was sent to ${newEmail.trim()}.`);
    } catch (resendError) {
      setError(resendError.message || "Could not resend the verification code.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0c1f2a]/45 px-4" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section role="dialog" aria-modal="true" aria-labelledby="email-change-title" className="w-full max-w-md rounded-xl border border-[#d4e4eb] bg-white p-6 shadow-[0_18px_55px_rgba(10,44,63,0.2)]">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 id="email-change-title" className="m-0 text-lg font-semibold text-[#173b4e]">{step === "details" ? "Change account email" : "Verify new email"}</h2>
            <p className="mb-0 mt-1 text-sm text-[#647c87]">
              {step === "details" ? "Confirm your password and enter the email address to use." : "Enter the six-digit code sent to your new email address."}
            </p>
          </div>
          <button type="button" aria-label="Close" onClick={onClose} className="rounded p-1 text-[#607985] hover:bg-[#edf4f7]"><X size={19} /></button>
        </div>

        {step === "details" ? (
          <form onSubmit={handleRequestCode} className="space-y-3">
            <label className="block text-xs font-medium text-[#405f6d]">
              Current password
              <input autoComplete="current-password" type="password" required value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} className="mt-1.5 w-full rounded-md border border-[#becbd1] bg-white px-3 py-2.5 text-sm text-[#203f4f] outline-none focus:border-[#168dff]" />
            </label>
            <label className="block text-xs font-medium text-[#405f6d]">
              New email address
              <input autoComplete="email" type="email" required value={newEmail} onChange={(event) => setNewEmail(event.target.value)} className="mt-1.5 w-full rounded-md border border-[#becbd1] bg-white px-3 py-2.5 text-sm text-[#203f4f] outline-none focus:border-[#168dff]" />
            </label>
            {error && <p role="alert" className="m-0 text-sm text-rose-700">{error}</p>}
            <button disabled={busy} className="h-10 w-full rounded-md border-0 bg-[#168dff] text-sm font-semibold text-white hover:bg-[#0876db] disabled:opacity-50">{busy ? "Sending code…" : "Send verification code"}</button>
          </form>
        ) : (
          <form onSubmit={handleVerify} className="space-y-3">
            <div className="flex items-center gap-2 rounded-md bg-[#f2f9fc] px-3 py-2 text-sm text-[#31596b]"><Mail size={16} /><span className="break-all">{newEmail.trim()}</span></div>
            <label className="block text-xs font-medium text-[#405f6d]">
              Verification code
              <input inputMode="numeric" autoComplete="one-time-code" maxLength={6} pattern="[0-9]{6}" required value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))} className="mt-1.5 w-full rounded-md border border-[#becbd1] bg-white px-3 py-2.5 text-center font-mono text-lg tracking-[.35em] text-[#203f4f] outline-none focus:border-[#168dff]" />
            </label>
            {notice && <p role="status" className="m-0 text-xs text-[#32734f]">{notice}</p>}
            {error && <p role="alert" className="m-0 text-sm text-rose-700">{error}</p>}
            <button disabled={busy || code.length !== 6} className="h-10 w-full rounded-md border-0 bg-[#168dff] text-sm font-semibold text-white hover:bg-[#0876db] disabled:opacity-50">{busy ? "Verifying…" : "Verify email"}</button>
            <button type="button" disabled={busy || secondsLeft > 0} onClick={() => void handleResend()} className="w-full border-0 bg-transparent py-1 text-sm font-medium text-[#0879ac] disabled:text-[#8ca1aa]">
              {secondsLeft > 0 ? `Resend code in ${secondsLeft}s` : "Resend code"}
            </button>
          </form>
        )}

      </section>
    </div>
  );
}

export default function AdminAccount() {
  setTitle("My Account");
  const { account, refreshAccount } = useAuth();
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [pageError, setPageError] = useState("");

  const refreshProfile = async () => {
    setPageError("");
    try {
      await refreshAccount();
    } catch (error) {
      setPageError(error.message || "Could not refresh account information.");
    }
  };

  const role = displayRole(account?.role);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
      <div className="mb-4 shrink-0 px-[5px]">
        <h1 className="m-0 text-[24px] font-bold text-[#244659]">My Account</h1>
        <p className="mb-0 mt-1 text-sm text-[#647c87]">View and update your administrator account details.</p>
      </div>

      {pageError && <div role="alert" className="mb-3 shrink-0 rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">{pageError}</div>}

      <section className="w-full max-w-3xl rounded-lg border border-[#a8d5e8] bg-white p-5 shadow-sm sm:p-7">
        <div className="mb-6 flex items-center gap-3 border-b border-[#e3edf1] pb-5">
          <div className="grid h-12 w-12 place-items-center rounded-full bg-[#e5f6fc] text-[#0879ac]"><CircleUserRound size={26} /></div>
          <div className="min-w-0">
            <h2 className="m-0 truncate text-lg font-semibold text-[#173b4e]">{account?.display_name || account?.name || "Administrator"}</h2>
            <p className="mb-0 mt-0.5 text-sm text-[#647c87]">Administrator account</p>
          </div>
        </div>

        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-md bg-[#f5fbff] p-4">
            <dt className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[#647c87]"><ShieldCheck size={15} /> Account role</dt>
            <dd className="mb-0 mt-2 text-[15px] font-semibold text-[#244659]">{role}</dd>
          </div>
          <div className="rounded-md bg-[#f5fbff] p-4">
            <dt className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[#647c87]"><AtSign size={15} /> Email address</dt>
            <dd className="mb-0 mt-2 break-all text-[15px] font-semibold text-[#244659]">{account?.email || "Not set"}</dd>
          </div>
          <div className="rounded-md bg-[#f5fbff] p-4 sm:col-span-2">
            <dt className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[#647c87]"><CircleUserRound size={15} /> Username</dt>
            <dd className="mb-0 mt-2 text-[15px] font-semibold text-[#244659]">{account?.username || "—"}</dd>
          </div>
        </dl>

        <div className="mt-6 flex flex-wrap gap-3 border-t border-[#e3edf1] pt-5">
          <button type="button" onClick={() => setPasswordModalOpen(true)} className="inline-flex h-10 items-center gap-2 rounded-md border border-[#168dff] bg-[#168dff] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#0876db]"><KeyRound size={16} />Change Password</button>
          <button type="button" onClick={() => { setPageError(""); setEmailModalOpen(true); }} className="inline-flex h-10 items-center gap-2 rounded-md border border-[#a8d5e8] bg-white px-4 text-sm font-semibold text-[#24566c] transition-colors hover:bg-[#f2f9fc]"><Mail size={16} />Change Email</button>
        </div>
      </section>

      <div className="mt-3 flex items-center gap-1.5 px-[5px] text-xs text-[#718792]"><CheckCircle2 size={14} />Email changes take effect after verification.</div>

      <ChangePasswordModal
        isOpen={passwordModalOpen}
        onClose={() => setPasswordModalOpen(false)}
        onSuccess={async () => {
          setPasswordModalOpen(false);
          await refreshProfile();
        }}
      />
      {emailModalOpen && <EmailChangeModal onClose={() => setEmailModalOpen(false)} onComplete={refreshProfile} />}
    </div>
  );
}

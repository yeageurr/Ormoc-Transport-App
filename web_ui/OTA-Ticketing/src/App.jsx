import { useAuth } from './context/AuthContext';

export default function App() {
  const { isLoading, account } = useAuth();

  if (isLoading) {
    return <main className="grid min-h-screen place-items-center text-slate-600">Checking session…</main>;
  }

  return (
    <main className="grid min-h-screen place-items-center bg-slate-50 p-6 text-slate-900">
      <section className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-teal-700">OTA Ticketing</p>
        <h1 className="mt-3 text-3xl font-bold">Ticketing Officer Portal</h1>
        <p className="mt-3 text-slate-600">
          Portal foundations are ready. The next step is building the pages for drivers, vehicles,
          dispatcher assignments, and dispatch operations.
        </p>
        <p className="mt-6 rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-700">
          {account ? `Signed in as ${account.username} (${account.role}).` : 'No active session.'}
        </p>
      </section>
    </main>
  );
}

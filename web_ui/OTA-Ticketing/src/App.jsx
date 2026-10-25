import { useEffect, useState } from 'react';
import LoginPage from './pages/auth/LoginPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import DispatchPage from './pages/dispatch/DispatchPage';
import UsersPage from './pages/users/UsersPage';
import RequiredPasswordChangePage from './pages/auth/RequiredPasswordChangePage';
import HistoryPage from './pages/history/HistoryPage';
import DispatchHistoryPage from './pages/dispatch/DispatchHistoryPage';
import { useAuth } from './context/AuthContext';

export default function App() {
  const { isLoading, account, signOut, mustChangePassword, completePasswordChange } = useAuth();
  const [route, setRoute] = useState(() => window.location.hash || '#login');

  useEffect(() => {
    const syncRoute = () => setRoute(window.location.hash || '#login');
    window.addEventListener('hashchange', syncRoute);
    return () => window.removeEventListener('hashchange', syncRoute);
  }, []);

  const goTo = (nextRoute) => { window.location.hash = nextRoute; };

  if (isLoading) {
    return <main className="grid min-h-screen place-items-center text-slate-700">Checking session…</main>;
  }

  if (account) {
    if (String(account.role).toLowerCase() !== 'ticketing_officer') {
      return (
        <main className="grid min-h-screen place-items-center bg-slate-50 p-6 text-slate-900">
          <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <h1 className="text-2xl font-bold">Ticketing officer access only</h1>
            <p className="mt-3 text-slate-600">This account cannot access this portal.</p>
            <button className="mt-6 rounded-lg bg-teal-700 px-4 py-2 font-semibold text-white" onClick={() => void signOut().then(() => goTo('#login'))}>Log out</button>
          </section>
        </main>
      );
    }
    if (mustChangePassword) return <RequiredPasswordChangePage onComplete={completePasswordChange} onLogout={() => void signOut().then(() => goTo('#login'))} />;
    if (route === '#history') return <HistoryPage />;
    if (route === '#dispatch-history') return <DispatchHistoryPage />;
    if (route === '#users') return <UsersPage />;
    return <DispatchPage />;
  }

  if (route === '#forgot-password') {
    return <ForgotPasswordPage onBackToLogin={() => goTo('#login')} />;
  }

  return (
    <LoginPage onForgotPassword={() => goTo('#forgot-password')} onSignedIn={() => goTo('#dispatch')} />
  );
}

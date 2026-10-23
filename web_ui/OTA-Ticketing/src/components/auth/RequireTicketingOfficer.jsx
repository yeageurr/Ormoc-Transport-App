import { useAuth } from '../../context/AuthContext';

export default function RequireTicketingOfficer({ children }) {
  const { account, isLoading } = useAuth();
  if (isLoading) return null;
  if (!account) return <p className="p-6 text-slate-700">Sign in to continue.</p>;
  if (account.role !== 'ticketing_officer') {
    return <p className="p-6 text-rose-700">This portal is for ticketing officers.</p>;
  }
  return children;
}

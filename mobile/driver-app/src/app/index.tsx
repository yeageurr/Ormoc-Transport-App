import { Redirect } from 'expo-router';

import { useAuth } from '@/hooks/useAuth';

/** Resolves the app's root deep link to the appropriate authenticated route. */
export default function Index() {
  const { isAuthenticated, isLoading, mustChangePassword } = useAuth();

  if (isLoading) {
    return null;
  }

  if (!isAuthenticated) return <Redirect href="/entrance" />;
  return <Redirect href={mustChangePassword ? '/change-password' : '/tabs'} />;
}

import { Redirect } from 'expo-router';

import { useAuth } from '@/hooks/useAuth';

/** Resolves the app's root deep link to the appropriate authenticated route. */
export default function Index() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return null;
  }

  return <Redirect href={isAuthenticated ? '/tabs' : '/login'} />;
}

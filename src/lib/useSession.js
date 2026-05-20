import useSWR from 'swr';

// Simple fetcher that returns JSON or throws on error
const fetcher = (url: string) => fetch(url).then(res => {
  if (!res.ok) throw new Error('Failed to fetch');
  return res.json();
});

/**
 * useSession – client hook to get the current auth session.
 * It calls the new `/api/auth/me` endpoint which returns
 * `{ session: { userId, username, role, status, ... } }` when a user
 * is logged in, otherwise it returns `null`.
 */
export function useSession() {
  const { data, error, isLoading, mutate } = useSWR('/api/auth/me', fetcher, {
    revalidateOnFocus: true,
    dedupingInterval: 5000
  });

  return {
    data: data?.session ?? null,
    status: isLoading ? 'loading' : error ? 'error' : data?.session ? 'authenticated' : 'unauthenticated',
    error,
    mutate
  };
}

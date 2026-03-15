'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { getStore } from '@/lib/api';

export function DashboardHeader() {
  const { storeId, token, isAuthenticated } = useAuth();
  const { data: store } = useQuery({
    queryKey: ['store', storeId],
    queryFn: () => getStore(storeId, token),
    enabled: isAuthenticated,
  });

  return (
    <header className="bg-white border-b px-6 py-4 flex items-center">
      <span className="font-semibold text-gray-800">{store?.name ?? 'My Store'}</span>
    </header>
  );
}

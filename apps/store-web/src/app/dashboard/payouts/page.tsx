'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { getPayouts } from '@/lib/api';
import { PayoutsTable } from '@/components/payouts/PayoutsTable';
import { Pagination } from '@cirvia/ui';
import { StatCard } from '@cirvia/ui';
import { formatCents } from '@cirvia/utils';

export default function PayoutsPage() {
  const { storeId, token, isAuthenticated } = useAuth();
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['payouts', storeId, page],
    queryFn: () => getPayouts(storeId, token, page),
    enabled: isAuthenticated,
  });

  const payouts = data?.data ?? [];
  const totalEarned = payouts
    .filter((p) => p.status === 'paid')
    .reduce((sum, p) => sum + p.amount_cents, 0);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Payouts</h1>

      <div className="mb-6 max-w-xs">
        <StatCard label="Total Earned" value={formatCents(totalEarned)} color="green" />
      </div>

      {isLoading ? (
        <div className="py-8 text-center text-gray-400">Loading payouts...</div>
      ) : (
        <>
          <PayoutsTable payouts={payouts} />
          {data && data.total > data.limit && (
            <Pagination
              page={data.page}
              total={data.total}
              limit={data.limit}
              onPageChange={setPage}
            />
          )}
        </>
      )}
    </div>
  );
}

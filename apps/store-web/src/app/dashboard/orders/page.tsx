'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { getOrders } from '@/lib/api';
import { OrdersTable } from '@/components/orders/OrdersTable';
import { Pagination } from '@/components/ui/Pagination';
import type { OrderStatus } from '@cirvia/types';

const STATUS_FILTERS: { label: string; value: string }[] = [
  { label: 'All', value: 'all' },
  { label: 'Pending', value: 'payment_confirmed' },
  { label: 'In Progress', value: 'preparing' },
  { label: 'Completed', value: 'delivered' },
  { label: 'Cancelled', value: 'cancelled' },
];

export default function OrdersPage() {
  const { storeId, token, isAuthenticated } = useAuth();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('all');

  const { data, isLoading } = useQuery({
    queryKey: ['orders', storeId, page],
    queryFn: () => getOrders(storeId, token, page),
    enabled: isAuthenticated,
  });

  const orders = data?.data ?? [];
  const filteredOrders =
    statusFilter === 'all'
      ? orders
      : orders.filter((o) => o.status === (statusFilter as OrderStatus));

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Orders</h1>

      <div className="flex gap-2 mb-4 flex-wrap">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => {
              setStatusFilter(f.value);
              setPage(1);
            }}
            className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
              statusFilter === f.value
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="py-8 text-center text-gray-400">Loading orders...</div>
      ) : (
        <>
          <OrdersTable orders={filteredOrders} />
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

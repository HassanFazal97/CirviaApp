'use client';

import { useRouter } from 'next/navigation';
import type { Order } from '@cirvia/types';
import { formatCents } from '@cirvia/utils';
import { StatusBadge } from '@cirvia/ui';

interface OrdersTableProps {
  orders: Order[];
  linkable?: boolean;
}

export function OrdersTable({ orders, linkable = true }: OrdersTableProps) {
  const router = useRouter();

  return (
    <div className="bg-white rounded-lg border overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left font-medium text-gray-600">Order ID</th>
            <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
            <th className="px-4 py-3 text-right font-medium text-gray-600">Total</th>
            <th className="px-4 py-3 text-left font-medium text-gray-600">Date</th>
          </tr>
        </thead>
        <tbody>
          {orders.length === 0 && (
            <tr>
              <td colSpan={4} className="px-4 py-8 text-center text-gray-400">
                No orders found
              </td>
            </tr>
          )}
          {orders.map((order) => (
            <tr
              key={order.id}
              className={`border-t hover:bg-gray-50 ${linkable ? 'cursor-pointer' : ''}`}
              onClick={linkable ? () => router.push(`/dashboard/orders/${order.id}`) : undefined}
            >
              <td className="px-4 py-3 font-mono text-xs">
                #{order.id.slice(0, 8).toUpperCase()}
              </td>
              <td className="px-4 py-3">
                <StatusBadge status={order.status} />
              </td>
              <td className="px-4 py-3 text-right font-medium">
                {formatCents(order.total_cents)}
              </td>
              <td className="px-4 py-3 text-gray-500">
                {new Date(order.created_at).toLocaleDateString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

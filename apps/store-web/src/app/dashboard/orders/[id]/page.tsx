'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { getOrder } from '@/lib/api';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { OrderStatusActions } from '@/components/orders/OrderStatusActions';
import { formatCents } from '@cirvia/utils';

export default function OrderDetailPage() {
  const params = useParams();
  const id = typeof params.id === 'string' ? params.id : '';
  const { token, isAuthenticated } = useAuth();

  const { data: order, isLoading } = useQuery({
    queryKey: ['order', id],
    queryFn: () => getOrder(id, token),
    enabled: isAuthenticated && !!id,
  });

  if (isLoading) return <div className="py-8 text-gray-400">Loading order...</div>;
  if (!order) return <div className="py-8 text-gray-500">Order not found.</div>;

  const addr = order.delivery_address;

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-2xl font-bold">Order #{order.id.slice(0, 8).toUpperCase()}</h1>
        <StatusBadge status={order.status} />
      </div>

      <div className="bg-white rounded-lg border p-4 mb-4">
        <h2 className="font-semibold mb-3">Delivery Address</h2>
        <p className="text-sm text-gray-600">
          {addr.line1}
          {addr.line2 ? `, ${addr.line2}` : ''}
          <br />
          {addr.city}, {addr.state} {addr.zip}
        </p>
        {order.delivery_notes && (
          <p className="text-sm text-gray-500 mt-2">Note: {order.delivery_notes}</p>
        )}
      </div>

      {order.items && order.items.length > 0 && (
        <div className="bg-white rounded-lg border p-4 mb-4">
          <h2 className="font-semibold mb-3">Items</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 text-xs">
                <th className="pb-2">Product ID</th>
                <th className="pb-2 text-right">Qty</th>
                <th className="pb-2 text-right">Unit Price</th>
                <th className="pb-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item) => (
                <tr key={item.id} className="border-t">
                  <td className="py-2 font-mono text-xs text-gray-500">
                    {item.product_id.slice(0, 8)}
                  </td>
                  <td className="py-2 text-right">{item.quantity}</td>
                  <td className="py-2 text-right">{formatCents(item.unit_price_cents)}</td>
                  <td className="py-2 text-right font-medium">{formatCents(item.total_cents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="bg-white rounded-lg border p-4 mb-6">
        <h2 className="font-semibold mb-3">Fee Breakdown</h2>
        <div className="space-y-1.5 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Subtotal</span>
            <span>{formatCents(order.subtotal_cents)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Delivery Fee</span>
            <span>{formatCents(order.delivery_fee_cents)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Platform Fee (15%)</span>
            <span>{formatCents(order.platform_fee_cents)}</span>
          </div>
          <div className="flex justify-between font-semibold border-t pt-1.5 mt-1">
            <span>Total</span>
            <span>{formatCents(order.total_cents)}</span>
          </div>
        </div>
      </div>

      <OrderStatusActions order={order} />
    </div>
  );
}

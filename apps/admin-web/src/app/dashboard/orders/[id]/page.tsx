'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Order, OrderItem } from '@cirvia/types';
import { formatCents, calculatePayoutSplits } from '@cirvia/utils';
import { apiFetch } from '@/lib/api';
import { StatusBadge } from '@cirvia/ui';

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<{ order: Order; items: OrderItem[] }>(`/orders/${id}`)
      .then((res) => {
        setOrder(res.order);
        setItems(res.items);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="p-8 text-gray-500">Loading...</div>;
  if (!order) return <div className="p-8 text-red-500">Order not found</div>;

  const splits = calculatePayoutSplits(order.total_cents);

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-4">
        <Link href="/dashboard/orders" className="text-sm text-blue-600 hover:underline">
          ← Back to Orders
        </Link>
      </div>

      <div className="bg-white rounded-lg border p-6 mb-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-xl font-bold font-mono">
              #{order.id.slice(0, 8).toUpperCase()}
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              {new Date(order.created_at).toLocaleString()}
            </p>
          </div>
          <StatusBadge status={order.status} />
        </div>

        <div className="grid grid-cols-2 gap-6 text-sm">
          <div>
            <h3 className="font-medium text-gray-700 mb-2">Delivery Address</h3>
            <p className="text-gray-600">{order.delivery_address.line1}</p>
            {order.delivery_address.line2 && (
              <p className="text-gray-600">{order.delivery_address.line2}</p>
            )}
            <p className="text-gray-600">
              {order.delivery_address.city}, {order.delivery_address.state} {order.delivery_address.zip}
            </p>
          </div>
          <div>
            <h3 className="font-medium text-gray-700 mb-2">Fee Breakdown</h3>
            <div className="space-y-1 text-gray-600">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>{formatCents(order.subtotal_cents)}</span>
              </div>
              <div className="flex justify-between">
                <span>Delivery fee</span>
                <span>{formatCents(order.delivery_fee_cents)}</span>
              </div>
              <div className="flex justify-between">
                <span>Platform fee (15%)</span>
                <span>{formatCents(order.platform_fee_cents)}</span>
              </div>
              <div className="flex justify-between font-medium text-gray-900 border-t pt-1 mt-1">
                <span>Total</span>
                <span>{formatCents(order.total_cents)}</span>
              </div>
            </div>
          </div>
        </div>

        {order.delivery_notes && (
          <div className="mt-4 text-sm">
            <span className="font-medium text-gray-700">Notes: </span>
            <span className="text-gray-600">{order.delivery_notes}</span>
          </div>
        )}
      </div>

      <section>
        <h2 className="text-lg font-semibold mb-3">Items</h2>
        <div className="bg-white rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Product ID</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">Qty</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">Unit Price</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">Total</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs text-gray-600">
                    {item.product_id.slice(0, 8)}...
                  </td>
                  <td className="px-4 py-3 text-right">{item.quantity}</td>
                  <td className="px-4 py-3 text-right">{formatCents(item.unit_price_cents)}</td>
                  <td className="px-4 py-3 text-right font-medium">{formatCents(item.total_cents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

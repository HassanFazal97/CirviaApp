'use client';

import { useEffect, useState } from 'react';
import { Payout } from '@cirvia/types';
import { formatCents } from '@cirvia/utils';
import { apiFetch } from '@/lib/api';
import StatusBadge from '@/components/StatusBadge';

export default function PayoutsPage() {
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<{ data: Payout[]; total: number }>('/admin/payouts?limit=100')
      .then((res) => {
        setPayouts(res.data);
        setTotal(res.total);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-8 text-gray-500">Loading...</div>;

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Payouts</h1>
        <span className="text-sm text-gray-500">{total} total</span>
      </div>

      <div className="bg-white rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Recipient</th>
              <th className="px-4 py-3 text-right font-medium text-gray-600">Amount</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Stripe Transfer</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Date</th>
            </tr>
          </thead>
          <tbody>
            {payouts.map((payout) => (
              <tr key={payout.id} className="border-t hover:bg-gray-50">
                <td className="px-4 py-3">
                  <span className="capitalize text-gray-700">{payout.recipient_type}</span>
                  <span className="ml-2 font-mono text-xs text-gray-400">
                    {payout.recipient_id.slice(0, 8)}...
                  </span>
                </td>
                <td className="px-4 py-3 text-right font-medium">
                  {formatCents(payout.amount_cents)}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={payout.status} />
                </td>
                <td className="px-4 py-3 font-mono text-xs text-gray-500">
                  {payout.stripe_transfer_id ?? '—'}
                </td>
                <td className="px-4 py-3 text-gray-500">
                  {new Date(payout.created_at).toLocaleDateString()}
                </td>
              </tr>
            ))}
            {payouts.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                  No payouts found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

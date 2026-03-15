import type { Payout } from '@cirvia/types';
import { formatCents } from '@cirvia/utils';
import { StatusBadge } from '@/components/ui/StatusBadge';

interface PayoutsTableProps {
  payouts: Payout[];
}

export function PayoutsTable({ payouts }: PayoutsTableProps) {
  return (
    <div className="bg-white rounded-lg border overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left font-medium text-gray-600">Order ID</th>
            <th className="px-4 py-3 text-right font-medium text-gray-600">Amount</th>
            <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
            <th className="px-4 py-3 text-left font-medium text-gray-600">Paid At</th>
          </tr>
        </thead>
        <tbody>
          {payouts.length === 0 && (
            <tr>
              <td colSpan={4} className="px-4 py-8 text-center text-gray-400">
                No payouts found
              </td>
            </tr>
          )}
          {payouts.map((payout) => (
            <tr key={payout.id} className="border-t hover:bg-gray-50">
              <td className="px-4 py-3 font-mono text-xs">
                #{payout.order_id.slice(0, 8).toUpperCase()}
              </td>
              <td className="px-4 py-3 text-right font-medium">
                {formatCents(payout.amount_cents)}
              </td>
              <td className="px-4 py-3">
                <StatusBadge status={payout.status} />
              </td>
              <td className="px-4 py-3 text-gray-500">
                {payout.paid_at ? new Date(payout.paid_at).toLocaleDateString() : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

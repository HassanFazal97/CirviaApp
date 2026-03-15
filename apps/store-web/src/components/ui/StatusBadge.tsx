const statusColors: Record<string, string> = {
  delivered: 'bg-green-100 text-green-800',
  paid: 'bg-green-100 text-green-800',
  active: 'bg-green-100 text-green-800',
  payment_confirmed: 'bg-yellow-100 text-yellow-800',
  store_accepted: 'bg-yellow-100 text-yellow-800',
  preparing: 'bg-yellow-100 text-yellow-800',
  pending: 'bg-yellow-100 text-yellow-800',
  processing: 'bg-yellow-100 text-yellow-800',
  ready_for_pickup: 'bg-blue-100 text-blue-800',
  in_transit: 'bg-blue-100 text-blue-800',
  cancelled: 'bg-red-100 text-red-800',
  refunded: 'bg-red-100 text-red-800',
  failed: 'bg-red-100 text-red-800',
  inactive: 'bg-gray-100 text-gray-600',
};

interface StatusBadgeProps {
  status: string;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const colorClass = statusColors[status] ?? 'bg-gray-100 text-gray-600';
  return (
    <span className={`px-2 py-1 rounded text-xs font-medium ${colorClass}`}>
      {status.replace(/_/g, ' ')}
    </span>
  );
}

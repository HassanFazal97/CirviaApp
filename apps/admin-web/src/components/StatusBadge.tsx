import clsx from 'clsx';

interface StatusBadgeProps {
  status: string;
}

const STATUS_CLASSES: Record<string, string> = {
  // Order / delivery
  delivered: 'bg-green-100 text-green-800',
  paid: 'bg-green-100 text-green-800',
  payment_confirmed: 'bg-blue-100 text-blue-800',
  store_accepted: 'bg-blue-100 text-blue-800',
  preparing: 'bg-blue-100 text-blue-800',
  ready_for_pickup: 'bg-blue-100 text-blue-800',
  in_transit: 'bg-yellow-100 text-yellow-800',
  pending: 'bg-yellow-100 text-yellow-800',
  pending_payment: 'bg-yellow-100 text-yellow-800',
  processing: 'bg-yellow-100 text-yellow-800',
  assigned: 'bg-yellow-100 text-yellow-800',
  en_route_to_store: 'bg-yellow-100 text-yellow-800',
  at_store: 'bg-yellow-100 text-yellow-800',
  picked_up: 'bg-yellow-100 text-yellow-800',
  cancelled: 'bg-red-100 text-red-800',
  refunded: 'bg-red-100 text-red-800',
  failed: 'bg-red-100 text-red-800',
  // Driver status
  online: 'bg-green-100 text-green-800',
  on_delivery: 'bg-yellow-100 text-yellow-800',
  offline: 'bg-gray-100 text-gray-600',
};

export default function StatusBadge({ status }: StatusBadgeProps) {
  const classes = STATUS_CLASSES[status] ?? 'bg-gray-100 text-gray-600';
  return (
    <span className={clsx('px-2 py-1 rounded text-xs font-medium', classes)}>
      {status.replace(/_/g, ' ')}
    </span>
  );
}

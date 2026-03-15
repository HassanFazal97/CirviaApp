'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { Order, OrderStatus } from '@cirvia/types';
import { updateOrderStatus } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';

interface OrderStatusActionsProps {
  order: Order;
}

const NEXT_ACTION: Partial<Record<OrderStatus, { label: string; nextStatus: OrderStatus }>> = {
  payment_confirmed: { label: 'Accept Order', nextStatus: 'store_accepted' },
  store_accepted: { label: 'Start Preparing', nextStatus: 'preparing' },
  preparing: { label: 'Mark Ready for Pickup', nextStatus: 'ready_for_pickup' },
};

export function OrderStatusActions({ order }: OrderStatusActionsProps) {
  const { token } = useAuth();
  const queryClient = useQueryClient();

  const action = NEXT_ACTION[order.status];

  const mutation = useMutation({
    mutationFn: (status: OrderStatus) => updateOrderStatus(order.id, status, token),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['order', order.id] });
      void queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });

  if (!action) return null;

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={() => mutation.mutate(action.nextStatus)}
        disabled={mutation.isPending}
        className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
      >
        {mutation.isPending ? 'Updating...' : action.label}
      </button>
      {mutation.isError && (
        <span className="text-red-600 text-sm">Failed to update status. Please try again.</span>
      )}
    </div>
  );
}

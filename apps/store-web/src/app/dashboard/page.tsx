'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { formatCents } from '@cirvia/utils';
import { useAuth } from '@/hooks/useAuth';
import { getOrders, getProducts } from '@/lib/api';
import { StatCard } from '@/components/ui/StatCard';
import { OrdersTable } from '@/components/orders/OrdersTable';
import { ProductsTable } from '@/components/products/ProductsTable';

export default function StoreDashboard() {
  const { storeId, token, isAuthenticated } = useAuth();

  const { data: ordersData, isLoading: ordersLoading } = useQuery({
    queryKey: ['orders', storeId],
    queryFn: () => getOrders(storeId, token),
    enabled: isAuthenticated,
  });

  const { data: productsData, isLoading: productsLoading } = useQuery({
    queryKey: ['products', storeId],
    queryFn: () => getProducts(storeId, token),
    enabled: isAuthenticated,
  });

  const orders = ordersData?.data ?? [];
  const products = productsData?.data ?? [];

  const pendingOrders = orders.filter(
    (o) => o.status === 'payment_confirmed' || o.status === 'store_accepted',
  );
  const totalRevenue = orders
    .filter((o) => o.status === 'delivered')
    .reduce((sum, o) => sum + o.subtotal_cents, 0);

  if (ordersLoading || productsLoading) {
    return <div className="py-8 text-gray-400">Loading dashboard...</div>;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard Overview</h1>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <StatCard label="Pending Orders" value={pendingOrders.length} color="blue" />
        <StatCard label="Total Revenue" value={formatCents(totalRevenue)} color="green" />
        <StatCard
          label="Active Products"
          value={products.filter((p) => p.is_active).length}
          color="purple"
        />
      </div>

      <section className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Recent Orders</h2>
          <Link href="/dashboard/orders" className="text-blue-600 text-sm hover:underline">
            View all →
          </Link>
        </div>
        <OrdersTable orders={orders.slice(0, 10)} />
      </section>

      <section>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Products</h2>
          <Link
            href="/dashboard/products/new"
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
          >
            + Add Product
          </Link>
        </div>
        <ProductsTable products={products.slice(0, 5)} />
      </section>
    </div>
  );
}

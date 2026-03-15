'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Order, User, Store, Driver } from '@cirvia/types';
import { formatCents } from '@cirvia/utils';
import { apiFetch } from '@/lib/api';
import StatCard from '@/components/StatCard';
import StatusBadge from '@/components/StatusBadge';

interface AdminUsersRes { data: User[]; total: number }
interface AdminStoresRes { data: Store[]; total: number }
interface AdminOrdersRes { data: Order[]; total: number }
interface AdminDriversRes { data: Driver[]; total: number }

export default function DashboardPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiFetch<AdminUsersRes>('/admin/users?limit=1'),
      apiFetch<AdminStoresRes>('/admin/stores?limit=200'),
      apiFetch<AdminOrdersRes>('/admin/orders?limit=200'),
      apiFetch<AdminDriversRes>('/admin/drivers?limit=200'),
    ])
      .then(([usersRes, storesRes, ordersRes, driversRes]) => {
        setUsers(usersRes.data);
        setStores(storesRes.data);
        setOrders(ordersRes.data);
        setDrivers(driversRes.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-8 text-gray-500">Loading...</div>;

  const today = new Date().toDateString();
  const ordersToday = orders.filter(
    (o) => new Date(o.created_at).toDateString() === today
  );
  const activeStores = stores.filter((s) => s.is_active);
  const onlineDrivers = drivers.filter((d) => d.status === 'online' || d.status === 'on_delivery');
  const platformRevenue = orders
    .filter((o) => o.status === 'delivered')
    .reduce((sum, o) => sum + o.platform_fee_cents, 0);
  const recentOrders = [...orders].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  ).slice(0, 5);

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Overview</h1>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        <StatCard label="Total Users" value={users.length || '—'} colorClass="text-blue-600" />
        <StatCard label="Active Stores" value={activeStores.length} colorClass="text-green-600" />
        <StatCard label="Orders Today" value={ordersToday.length} colorClass="text-purple-600" />
        <StatCard label="Online Drivers" value={onlineDrivers.length} colorClass="text-yellow-600" />
        <StatCard label="Platform Revenue" value={formatCents(platformRevenue)} colorClass="text-emerald-600" />
        <StatCard label="Total Orders" value={orders.length} colorClass="text-gray-700" />
      </div>

      <section>
        <h2 className="text-lg font-semibold mb-3">Recent Orders</h2>
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
              {recentOrders.map((order) => (
                <tr key={order.id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/dashboard/orders/${order.id}`}
                      className="font-mono text-xs text-blue-600 hover:underline"
                    >
                      #{order.id.slice(0, 8).toUpperCase()}
                    </Link>
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
              {recentOrders.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-gray-400">
                    No orders yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

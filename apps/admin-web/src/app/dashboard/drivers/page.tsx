'use client';

import { useEffect, useState } from 'react';
import { Driver } from '@cirvia/types';
import { apiFetch } from '@/lib/api';
import StatusBadge from '@/components/StatusBadge';

export default function DriversPage() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<{ data: Driver[]; total: number }>('/admin/drivers?limit=100')
      .then((res) => {
        setDrivers(res.data);
        setTotal(res.total);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const toggleVerify = async (driver: Driver) => {
    setVerifyingId(driver.id);
    try {
      const res = await apiFetch<{ driver: Driver }>(`/admin/drivers/${driver.id}/verify`, {
        method: 'PATCH',
      });
      setDrivers((prev) => prev.map((d) => (d.id === driver.id ? res.driver : d)));
    } catch (err) {
      console.error(err);
    } finally {
      setVerifyingId(null);
    }
  };

  if (loading) return <div className="p-8 text-gray-500">Loading...</div>;

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Drivers</h1>
        <span className="text-sm text-gray-500">{total} total</span>
      </div>

      <div className="bg-white rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Driver ID</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Vehicle</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Verified</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Action</th>
            </tr>
          </thead>
          <tbody>
            {drivers.map((driver) => (
              <tr key={driver.id} className="border-t hover:bg-gray-50">
                <td className="px-4 py-3 font-mono text-xs text-gray-600">
                  {driver.id.slice(0, 8)}...
                </td>
                <td className="px-4 py-3 capitalize text-gray-700">{driver.vehicle_type}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={driver.status} />
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    driver.is_verified
                      ? 'bg-green-100 text-green-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {driver.is_verified ? 'Verified' : 'Unverified'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => toggleVerify(driver)}
                    disabled={verifyingId === driver.id}
                    className="text-xs text-blue-600 hover:underline disabled:opacity-50"
                  >
                    {verifyingId === driver.id
                      ? 'Saving...'
                      : driver.is_verified
                      ? 'Unverify'
                      : 'Verify'}
                  </button>
                </td>
              </tr>
            ))}
            {drivers.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                  No drivers found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

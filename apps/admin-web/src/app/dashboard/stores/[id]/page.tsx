'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Store, Product } from '@cirvia/types';
import { formatCents } from '@cirvia/utils';
import { apiFetch } from '@/lib/api';

export default function StoreDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [store, setStore] = useState<Store | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    Promise.all([
      apiFetch<{ store: Store }>(`/stores/${id}`),
      apiFetch<{ data: Product[]; total: number }>(`/stores/${id}/products?limit=100`),
    ])
      .then(([storeRes, productsRes]) => {
        setStore(storeRes.store);
        setProducts(productsRes.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  const toggleActive = async () => {
    if (!store) return;
    setToggling(true);
    try {
      const res = await apiFetch<{ store: Store }>(`/admin/stores/${id}/active`, {
        method: 'PATCH',
      });
      setStore(res.store);
    } catch (err) {
      console.error(err);
    } finally {
      setToggling(false);
    }
  };

  if (loading) return <div className="p-8 text-gray-500">Loading...</div>;
  if (!store) return <div className="p-8 text-red-500">Store not found</div>;

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-4">
        <Link href="/dashboard/stores" className="text-sm text-blue-600 hover:underline">
          ← Back to Stores
        </Link>
      </div>

      <div className="bg-white rounded-lg border p-6 mb-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold mb-1">{store.name}</h1>
            <p className="text-gray-500 text-sm capitalize">{store.type} · {store.address.city}, {store.address.state}</p>
            {store.description && (
              <p className="mt-2 text-gray-600 text-sm">{store.description}</p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              store.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
            }`}>
              {store.is_active ? 'Active' : 'Inactive'}
            </span>
            <button
              onClick={toggleActive}
              disabled={toggling}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {toggling ? 'Saving...' : store.is_active ? 'Deactivate' : 'Activate'}
            </button>
          </div>
        </div>
      </div>

      <section>
        <h2 className="text-lg font-semibold mb-3">Products ({products.length})</h2>
        <div className="bg-white rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Name</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Category</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">Price</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">Stock</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{product.name}</td>
                  <td className="px-4 py-3 text-gray-500">{product.category}</td>
                  <td className="px-4 py-3 text-right">{formatCents(product.price_cents)}</td>
                  <td className="px-4 py-3 text-right">
                    <span className={product.stock < 10 ? 'text-red-600 font-medium' : ''}>
                      {product.stock}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      product.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {product.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                </tr>
              ))}
              {products.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                    No products
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

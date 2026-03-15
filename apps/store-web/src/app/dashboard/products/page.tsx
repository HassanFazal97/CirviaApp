'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { getProducts } from '@/lib/api';
import { ProductsTable } from '@/components/products/ProductsTable';

export default function ProductsPage() {
  const { storeId, token, isAuthenticated } = useAuth();
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'inactive'>('all');

  const { data, isLoading } = useQuery({
    queryKey: ['products', storeId],
    queryFn: () => getProducts(storeId, token),
    enabled: isAuthenticated,
  });

  const allProducts = data?.data ?? [];
  const filtered = allProducts
    .filter((p) => {
      if (activeFilter === 'active') return p.is_active;
      if (activeFilter === 'inactive') return !p.is_active;
      return true;
    })
    .filter((p) =>
      search ? p.name.toLowerCase().includes(search.toLowerCase()) : true,
    );

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Products</h1>
        <Link
          href="/dashboard/products/new"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
        >
          + Add Product
        </Link>
      </div>

      <div className="flex gap-3 mb-4 flex-wrap">
        <input
          type="text"
          placeholder="Search products..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm flex-1 max-w-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <div className="flex gap-1">
          {(['all', 'active', 'inactive'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className={`px-3 py-2 text-sm rounded-lg border capitalize transition-colors ${
                activeFilter === f
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white hover:bg-gray-50'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="py-8 text-center text-gray-400">Loading products...</div>
      ) : (
        <ProductsTable products={filtered} />
      )}
    </div>
  );
}

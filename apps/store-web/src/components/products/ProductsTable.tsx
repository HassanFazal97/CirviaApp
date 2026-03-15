import Link from 'next/link';
import type { Product } from '@cirvia/types';
import { formatCents } from '@cirvia/utils';
import { StatusBadge } from '@cirvia/ui';

interface ProductsTableProps {
  products: Product[];
}

export function ProductsTable({ products }: ProductsTableProps) {
  return (
    <div className="bg-white rounded-lg border overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left font-medium text-gray-600">Name</th>
            <th className="px-4 py-3 text-left font-medium text-gray-600">Category</th>
            <th className="px-4 py-3 text-right font-medium text-gray-600">Price</th>
            <th className="px-4 py-3 text-right font-medium text-gray-600">Stock</th>
            <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
            <th className="px-4 py-3 text-left font-medium text-gray-600">Actions</th>
          </tr>
        </thead>
        <tbody>
          {products.length === 0 && (
            <tr>
              <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                No products found
              </td>
            </tr>
          )}
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
                <StatusBadge status={product.is_active ? 'active' : 'inactive'} />
              </td>
              <td className="px-4 py-3">
                <Link
                  href={`/dashboard/products/${product.id}`}
                  className="text-blue-600 hover:underline text-xs font-medium"
                >
                  Edit
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

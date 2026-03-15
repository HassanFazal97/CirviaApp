'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { getProduct } from '@/lib/api';
import { ProductForm } from '@/components/products/ProductForm';

export default function EditProductPage() {
  const params = useParams();
  const id = typeof params.id === 'string' ? params.id : '';
  const { token, isAuthenticated } = useAuth();

  const { data: product, isLoading } = useQuery({
    queryKey: ['product', id],
    queryFn: () => getProduct(id, token),
    enabled: isAuthenticated && !!id,
  });

  if (isLoading) return <div className="py-8 text-gray-400">Loading product...</div>;
  if (!product) return <div className="py-8 text-gray-500">Product not found.</div>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Edit Product</h1>
      <ProductForm mode="edit" product={product} />
    </div>
  );
}

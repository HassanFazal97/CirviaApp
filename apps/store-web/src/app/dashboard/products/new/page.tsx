import { ProductForm } from '@/components/products/ProductForm';

export default function NewProductPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Add Product</h1>
      <ProductForm mode="create" />
    </div>
  );
}

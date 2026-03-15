'use client';

import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/hooks/useAuth';
import { getStore, updateStore } from '@/lib/api';

const settingsSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  phone: z.string().optional(),
  email: z.union([z.string().email('Invalid email address'), z.literal('')]).optional(),
  is_active: z.boolean(),
});

type SettingsFormValues = z.infer<typeof settingsSchema>;

export default function SettingsPage() {
  const { storeId, token, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [successMsg, setSuccessMsg] = useState('');

  const { data: store, isLoading } = useQuery({
    queryKey: ['store', storeId],
    queryFn: () => getStore(storeId, token),
    enabled: isAuthenticated,
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      name: '',
      description: '',
      phone: '',
      email: '',
      is_active: true,
    },
  });

  useEffect(() => {
    if (store) {
      reset({
        name: store.name,
        description: store.description ?? '',
        phone: store.phone ?? '',
        email: store.email ?? '',
        is_active: store.is_active,
      });
    }
  }, [store, reset]);

  const mutation = useMutation({
    mutationFn: (values: SettingsFormValues) =>
      updateStore(
        storeId,
        {
          name: values.name,
          description: values.description || undefined,
          phone: values.phone || undefined,
          email: values.email || undefined,
          is_active: values.is_active,
        },
        token,
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['store', storeId] });
      setSuccessMsg('Settings saved successfully!');
      setTimeout(() => setSuccessMsg(''), 3000);
    },
  });

  if (isLoading) return <div className="py-8 text-gray-400">Loading settings...</div>;

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-bold mb-6">Store Settings</h1>

      <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Store Name *</label>
          <input
            {...register('name')}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {errors.name && <p className="text-red-600 text-xs mt-1">{errors.name.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea
            {...register('description')}
            rows={3}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
          <input
            {...register('phone')}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input
            type="email"
            {...register('email')}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {errors.email && <p className="text-red-600 text-xs mt-1">{errors.email.message}</p>}
        </div>

        {store && (
          <div className="bg-gray-50 rounded-lg p-3 border">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
              Address (read-only)
            </p>
            <p className="text-sm text-gray-700">
              {store.address.line1}
              {store.address.line2 ? `, ${store.address.line2}` : ''}
              <br />
              {store.address.city}, {store.address.state} {store.address.zip}
            </p>
          </div>
        )}

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="is_active"
            {...register('is_active')}
            className="rounded"
          />
          <label htmlFor="is_active" className="text-sm text-gray-700">
            Store is active (visible to buyers)
          </label>
        </div>

        {successMsg && <p className="text-green-600 text-sm font-medium">{successMsg}</p>}
        {mutation.isError && (
          <p className="text-red-600 text-sm">Failed to save settings. Please try again.</p>
        )}

        <button
          type="submit"
          disabled={mutation.isPending}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {mutation.isPending ? 'Saving...' : 'Save Settings'}
        </button>
      </form>
    </div>
  );
}

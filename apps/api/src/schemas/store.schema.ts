import { z } from 'zod';

const addressSchema = z.object({
  line1: z.string().min(1),
  line2: z.string().optional(),
  city: z.string().min(1),
  state: z.string().min(1),
  zip: z.string().min(1),
  country: z.string().default('US'),
  lat: z.number().optional(),
  lng: z.number().optional(),
});

export const nearbyQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  radius: z.coerce.number().min(100).max(50_000).default(10_000),
  limit: z.coerce.number().min(1).max(50).default(20),
  offset: z.coerce.number().min(0).default(0),
});

export const createStoreSchema = z.object({
  type: z.enum(['retail', 'individual']),
  name: z.string().min(2).max(200),
  description: z.string().max(2000).optional(),
  address: addressSchema,
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  phone: z.string().optional(),
  email: z.string().email().optional(),
});

export const updateStoreSchema = z.object({
  name: z.string().min(2).max(200).optional(),
  description: z.string().max(2000).optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  is_active: z.boolean().optional(),
  logo_url: z.string().url().optional(),
});

export const createProductSchema = z.object({
  name: z.string().min(2).max(300),
  description: z.string().max(2000).optional(),
  sku: z.string().max(100).optional(),
  category: z.string().min(1).max(100),
  unit: z.string().min(1).max(50),
  price_cents: z.number().int().positive(),
  stock: z.number().int().nonnegative(),
  image_urls: z.array(z.string().url()).max(10).default([]),
  weight_kg: z.number().positive().optional(),
  condition: z.enum(['new', 'used', 'excess']).default('new'),
});

export const updateProductSchema = createProductSchema.partial().extend({
  is_active: z.boolean().optional(),
});

export type NearbyQuery = z.infer<typeof nearbyQuerySchema>;
export type CreateStoreBody = z.infer<typeof createStoreSchema>;
export type UpdateStoreBody = z.infer<typeof updateStoreSchema>;
export type CreateProductBody = z.infer<typeof createProductSchema>;
export type UpdateProductBody = z.infer<typeof updateProductSchema>;

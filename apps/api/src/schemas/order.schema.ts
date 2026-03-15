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

export const createOrderSchema = z.object({
  store_id: z.string().uuid(),
  items: z
    .array(
      z.object({
        product_id: z.string().uuid(),
        quantity: z.number().int().positive(),
      })
    )
    .min(1)
    .max(50),
  delivery_address: addressSchema,
  delivery_notes: z.string().max(500).optional(),
});

export type CreateOrderBody = z.infer<typeof createOrderSchema>;

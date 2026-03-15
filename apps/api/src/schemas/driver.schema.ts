import { z } from 'zod';

export const createDriverSchema = z.object({
  vehicle_type: z.enum(['bicycle', 'motorcycle', 'car', 'van', 'truck']),
  vehicle_plate: z.string().max(20).optional(),
  license_number: z.string().max(50).optional(),
});

export const updateLocationSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

export const updateDeliveryStatusSchema = z.object({
  status: z.enum(['en_route_to_store', 'at_store', 'picked_up', 'in_transit', 'delivered', 'failed']),
});

export type CreateDriverBody = z.infer<typeof createDriverSchema>;
export type UpdateLocationBody = z.infer<typeof updateLocationSchema>;
export type UpdateDeliveryStatusBody = z.infer<typeof updateDeliveryStatusSchema>;

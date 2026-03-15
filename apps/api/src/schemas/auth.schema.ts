import { z } from 'zod';

export const registerBodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(72),
  full_name: z.string().min(2).max(100),
  role: z.enum(['buyer', 'store_owner', 'driver']),
  phone: z.string().optional(),
});

export const loginBodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const refreshBodySchema = z.object({
  refresh_token: z.string().uuid(),
});

export const logoutBodySchema = z.object({
  refresh_token: z.string().uuid(),
});

export const updateProfileBodySchema = z.object({
  full_name: z.string().min(2).max(100).optional(),
  phone: z.string().optional(),
  avatar_url: z.string().url().optional(),
  push_token: z.string().optional(),
});

export type RegisterBody = z.infer<typeof registerBodySchema>;
export type LoginBody = z.infer<typeof loginBodySchema>;
export type RefreshBody = z.infer<typeof refreshBodySchema>;
export type LogoutBody = z.infer<typeof logoutBodySchema>;
export type UpdateProfileBody = z.infer<typeof updateProfileBodySchema>;

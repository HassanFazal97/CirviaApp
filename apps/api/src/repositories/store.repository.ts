import { pool } from '../db';
import { Store, StoreType, Address, StoreWithDistance } from '@cirvia/types';

export interface CreateStoreInput {
  id: string;
  owner_id: string;
  type: StoreType;
  name: string;
  description?: string;
  address: Address;
  lat: number;
  lng: number;
  phone?: string;
  email?: string;
}

export interface UpdateStoreInput {
  name?: string;
  description?: string;
  phone?: string;
  email?: string;
  is_active?: boolean;
  logo_url?: string;
}

export const storeRepository = {
  async findById(id: string): Promise<Store | null> {
    const { rows } = await pool.query<Store>(
      'SELECT * FROM stores WHERE id = $1 AND deleted_at IS NULL',
      [id]
    );
    return rows[0] ?? null;
  },

  /** PostGIS ST_DWithin radius search — distance in meters */
  async findNearby(
    lat: number,
    lng: number,
    radiusMeters = 10_000,
    limit = 20,
    offset = 0
  ): Promise<StoreWithDistance[]> {
    const { rows } = await pool.query<StoreWithDistance>(
      `SELECT *,
              ST_Distance(location, ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography) AS distance_meters
       FROM stores
       WHERE deleted_at IS NULL
         AND is_active = true
         AND ST_DWithin(
               location,
               ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography,
               $3
             )
       ORDER BY distance_meters ASC
       LIMIT $4 OFFSET $5`,
      [lat, lng, radiusMeters, limit, offset]
    );
    return rows;
  },

  async create(input: CreateStoreInput): Promise<Store> {
    const { rows } = await pool.query<Store>(
      `INSERT INTO stores (id, owner_id, type, name, description, address, lat, lng, phone, email, location)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, ST_SetSRID(ST_MakePoint($8, $7), 4326)::geography)
       RETURNING *`,
      [
        input.id,
        input.owner_id,
        input.type,
        input.name,
        input.description ?? null,
        JSON.stringify(input.address),
        input.lat,
        input.lng,
        input.phone ?? null,
        input.email ?? null,
      ]
    );
    return rows[0]!;
  },

  async update(id: string, input: UpdateStoreInput): Promise<Store | null> {
    const fields: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (input.name !== undefined) { fields.push(`name = $${idx++}`); values.push(input.name); }
    if (input.description !== undefined) { fields.push(`description = $${idx++}`); values.push(input.description); }
    if (input.phone !== undefined) { fields.push(`phone = $${idx++}`); values.push(input.phone); }
    if (input.email !== undefined) { fields.push(`email = $${idx++}`); values.push(input.email); }
    if (input.is_active !== undefined) { fields.push(`is_active = $${idx++}`); values.push(input.is_active); }
    if (input.logo_url !== undefined) { fields.push(`logo_url = $${idx++}`); values.push(input.logo_url); }

    if (fields.length === 0) return this.findById(id);

    fields.push(`updated_at = NOW()`);
    values.push(id);

    const { rows } = await pool.query<Store>(
      `UPDATE stores SET ${fields.join(', ')} WHERE id = $${idx} AND deleted_at IS NULL RETURNING *`,
      values
    );
    return rows[0] ?? null;
  },

  async softDelete(id: string): Promise<void> {
    await pool.query(
      'UPDATE stores SET deleted_at = NOW() WHERE id = $1',
      [id]
    );
  },
};

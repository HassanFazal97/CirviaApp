import { pool } from '../db';
import { Driver, Delivery, DeliveryStatus, VehicleType, DriverStatus } from '@cirvia/types';

export interface CreateDriverInput {
  id: string;
  user_id: string;
  vehicle_type: VehicleType;
  vehicle_plate?: string;
  license_number?: string;
}

export interface CreateDeliveryInput {
  id: string;
  order_id: string;
  pickup_address: object;
  dropoff_address: object;
  driver_fee_cents: number;
}

export const driverRepository = {
  async findById(id: string): Promise<Driver | null> {
    const { rows } = await pool.query<Driver>(
      'SELECT * FROM drivers WHERE id = $1 AND deleted_at IS NULL',
      [id]
    );
    return rows[0] ?? null;
  },

  async findByUserId(user_id: string): Promise<Driver | null> {
    const { rows } = await pool.query<Driver>(
      'SELECT * FROM drivers WHERE user_id = $1 AND deleted_at IS NULL',
      [user_id]
    );
    return rows[0] ?? null;
  },

  async create(input: CreateDriverInput): Promise<Driver> {
    const { rows } = await pool.query<Driver>(
      `INSERT INTO drivers (id, user_id, vehicle_type, vehicle_plate, license_number)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [
        input.id,
        input.user_id,
        input.vehicle_type,
        input.vehicle_plate ?? null,
        input.license_number ?? null,
      ]
    );
    return rows[0]!;
  },

  async updateLocation(id: string, lat: number, lng: number): Promise<void> {
    await pool.query(
      `UPDATE drivers SET current_lat = $1, current_lng = $2, updated_at = NOW() WHERE id = $3`,
      [lat, lng, id]
    );
  },

  async updateStatus(id: string, status: DriverStatus): Promise<void> {
    await pool.query(
      'UPDATE drivers SET status = $1, updated_at = NOW() WHERE id = $2',
      [status, id]
    );
  },

  // ─── Deliveries ──────────────────────────────────────────────────────────

  async findDeliveryById(id: string): Promise<Delivery | null> {
    const { rows } = await pool.query<Delivery>(
      'SELECT * FROM deliveries WHERE id = $1',
      [id]
    );
    return rows[0] ?? null;
  },

  async findDeliveryByOrder(order_id: string): Promise<Delivery | null> {
    const { rows } = await pool.query<Delivery>(
      'SELECT * FROM deliveries WHERE order_id = $1',
      [order_id]
    );
    return rows[0] ?? null;
  },

  /** Find available deliveries near a driver — uses PostGIS on store locations */
  async findAvailableNearby(
    lat: number,
    lng: number,
    radiusMeters = 5_000
  ): Promise<Delivery[]> {
    const { rows } = await pool.query<Delivery>(
      `SELECT d.*
       FROM deliveries d
       JOIN orders o ON o.id = d.order_id
       JOIN stores s ON s.id = o.store_id
       WHERE d.status = 'pending'
         AND d.driver_id IS NULL
         AND ST_DWithin(
               s.location,
               ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography,
               $3
             )
       ORDER BY d.created_at ASC`,
      [lat, lng, radiusMeters]
    );
    return rows;
  },

  async createDelivery(input: CreateDeliveryInput): Promise<Delivery> {
    const { rows } = await pool.query<Delivery>(
      `INSERT INTO deliveries (id, order_id, pickup_address, dropoff_address, driver_fee_cents)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [
        input.id,
        input.order_id,
        JSON.stringify(input.pickup_address),
        JSON.stringify(input.dropoff_address),
        input.driver_fee_cents,
      ]
    );
    return rows[0]!;
  },

  async assignDriver(delivery_id: string, driver_id: string): Promise<Delivery | null> {
    const { rows } = await pool.query<Delivery>(
      `UPDATE deliveries
       SET driver_id = $1, status = 'assigned', updated_at = NOW()
       WHERE id = $2 AND driver_id IS NULL AND status = 'pending'
       RETURNING *`,
      [driver_id, delivery_id]
    );
    return rows[0] ?? null;
  },

  async updateDeliveryStatus(
    id: string,
    status: DeliveryStatus,
    extras: { proof_photo_url?: string; pickup_at?: Date; delivered_at?: Date } = {}
  ): Promise<Delivery | null> {
    const fields = ['status = $1', 'updated_at = NOW()'];
    const values: unknown[] = [status];
    let idx = 2;

    if (extras.proof_photo_url !== undefined) {
      fields.push(`proof_photo_url = $${idx++}`);
      values.push(extras.proof_photo_url);
    }
    if (extras.pickup_at !== undefined) {
      fields.push(`pickup_at = $${idx++}`);
      values.push(extras.pickup_at);
    }
    if (extras.delivered_at !== undefined) {
      fields.push(`delivered_at = $${idx++}`);
      values.push(extras.delivered_at);
    }

    values.push(id);
    const { rows } = await pool.query<Delivery>(
      `UPDATE deliveries SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    );
    return rows[0] ?? null;
  },
};

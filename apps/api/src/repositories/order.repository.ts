import { pool } from '../db';
import { Order, OrderItem, OrderStatus, Address } from '@cirvia/types';

export interface CreateOrderInput {
  id: string;
  buyer_id: string;
  store_id: string;
  delivery_address: Address;
  delivery_notes?: string;
  subtotal_cents: number;
  delivery_fee_cents: number;
  platform_fee_cents: number;
  total_cents: number;
  stripe_payment_intent_id: string;
}

export interface CreateOrderItemInput {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  unit_price_cents: number;
  total_cents: number;
}

export const orderRepository = {
  async findById(id: string): Promise<Order | null> {
    const { rows } = await pool.query<Order>(
      'SELECT * FROM orders WHERE id = $1 AND deleted_at IS NULL',
      [id]
    );
    return rows[0] ?? null;
  },

  async findByBuyer(
    buyer_id: string,
    opts: { limit?: number; offset?: number } = {}
  ): Promise<{ data: Order[]; total: number }> {
    const limit = opts.limit ?? 20;
    const offset = opts.offset ?? 0;

    const [{ rows: data }, { rows: countRows }] = await Promise.all([
      pool.query<Order>(
        `SELECT * FROM orders WHERE buyer_id = $1 AND deleted_at IS NULL
         ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
        [buyer_id, limit, offset]
      ),
      pool.query<{ count: string }>(
        'SELECT COUNT(*) FROM orders WHERE buyer_id = $1 AND deleted_at IS NULL',
        [buyer_id]
      ),
    ]);

    return { data, total: parseInt(countRows[0]?.count ?? '0', 10) };
  },

  async findByStore(
    store_id: string,
    opts: { limit?: number; offset?: number; status?: OrderStatus } = {}
  ): Promise<{ data: Order[]; total: number }> {
    const limit = opts.limit ?? 20;
    const offset = opts.offset ?? 0;
    const params: unknown[] = [store_id, limit, offset];
    let statusClause = '';

    if (opts.status) {
      params.push(opts.status);
      statusClause = `AND status = $${params.length}`;
    }

    const [{ rows: data }, { rows: countRows }] = await Promise.all([
      pool.query<Order>(
        `SELECT * FROM orders WHERE store_id = $1 AND deleted_at IS NULL ${statusClause}
         ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
        params
      ),
      pool.query<{ count: string }>(
        `SELECT COUNT(*) FROM orders WHERE store_id = $1 AND deleted_at IS NULL ${statusClause}`,
        [store_id, ...(opts.status ? [opts.status] : [])]
      ),
    ]);

    return { data, total: parseInt(countRows[0]?.count ?? '0', 10) };
  },

  async create(input: CreateOrderInput): Promise<Order> {
    const { rows } = await pool.query<Order>(
      `INSERT INTO orders
         (id, buyer_id, store_id, status, delivery_address, delivery_notes,
          subtotal_cents, delivery_fee_cents, platform_fee_cents, total_cents,
          stripe_payment_intent_id)
       VALUES ($1, $2, $3, 'pending_payment', $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        input.id,
        input.buyer_id,
        input.store_id,
        JSON.stringify(input.delivery_address),
        input.delivery_notes ?? null,
        input.subtotal_cents,
        input.delivery_fee_cents,
        input.platform_fee_cents,
        input.total_cents,
        input.stripe_payment_intent_id,
      ]
    );
    return rows[0]!;
  },

  async createItems(items: CreateOrderItemInput[]): Promise<OrderItem[]> {
    if (items.length === 0) return [];

    const values = items.map((item, i) => {
      const base = i * 6;
      return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6})`;
    });

    const params = items.flatMap((item) => [
      item.id,
      item.order_id,
      item.product_id,
      item.quantity,
      item.unit_price_cents,
      item.total_cents,
    ]);

    const { rows } = await pool.query<OrderItem>(
      `INSERT INTO order_items (id, order_id, product_id, quantity, unit_price_cents, total_cents)
       VALUES ${values.join(', ')} RETURNING *`,
      params
    );
    return rows;
  },

  async updateStatus(id: string, status: OrderStatus): Promise<Order | null> {
    const { rows } = await pool.query<Order>(
      `UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2 AND deleted_at IS NULL RETURNING *`,
      [status, id]
    );
    return rows[0] ?? null;
  },

  async updateStripeStatus(
    paymentIntentId: string,
    status: string
  ): Promise<Order | null> {
    const { rows } = await pool.query<Order>(
      `UPDATE orders SET stripe_payment_status = $1, updated_at = NOW()
       WHERE stripe_payment_intent_id = $2 AND deleted_at IS NULL RETURNING *`,
      [status, paymentIntentId]
    );
    return rows[0] ?? null;
  },

  async getItems(order_id: string): Promise<OrderItem[]> {
    const { rows } = await pool.query<OrderItem>(
      'SELECT * FROM order_items WHERE order_id = $1',
      [order_id]
    );
    return rows;
  },
};

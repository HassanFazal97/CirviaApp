import { pool } from '../db';
import { Product, ProductCondition } from '@cirvia/types';

export interface CreateProductInput {
  id: string;
  store_id: string;
  name: string;
  description?: string;
  sku?: string;
  category: string;
  unit: string;
  price_cents: number;
  stock: number;
  image_urls?: string[];
  weight_kg?: number;
  condition?: ProductCondition;
}

export interface UpdateProductInput {
  name?: string;
  description?: string;
  sku?: string;
  category?: string;
  unit?: string;
  price_cents?: number;
  stock?: number;
  image_urls?: string[];
  weight_kg?: number;
  condition?: ProductCondition;
  is_active?: boolean;
}

export interface ListProductsOptions {
  store_id?: string;
  category?: string;
  is_active?: boolean;
  limit?: number;
  offset?: number;
}

export const productRepository = {
  async findById(id: string): Promise<Product | null> {
    const { rows } = await pool.query<Product>(
      'SELECT * FROM products WHERE id = $1 AND deleted_at IS NULL',
      [id]
    );
    return rows[0] ?? null;
  },

  async listByStore(
    store_id: string,
    opts: { limit?: number; offset?: number } = {}
  ): Promise<{ data: Product[]; total: number }> {
    const limit = opts.limit ?? 20;
    const offset = opts.offset ?? 0;

    const [{ rows: data }, { rows: countRows }] = await Promise.all([
      pool.query<Product>(
        `SELECT * FROM products WHERE store_id = $1 AND deleted_at IS NULL
         ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
        [store_id, limit, offset]
      ),
      pool.query<{ count: string }>(
        'SELECT COUNT(*) FROM products WHERE store_id = $1 AND deleted_at IS NULL',
        [store_id]
      ),
    ]);

    return { data, total: parseInt(countRows[0]?.count ?? '0', 10) };
  },

  async create(input: CreateProductInput): Promise<Product> {
    const { rows } = await pool.query<Product>(
      `INSERT INTO products (id, store_id, name, description, sku, category, unit, price_cents, stock, image_urls, weight_kg, condition)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
      [
        input.id,
        input.store_id,
        input.name,
        input.description ?? null,
        input.sku ?? null,
        input.category,
        input.unit,
        input.price_cents,
        input.stock,
        JSON.stringify(input.image_urls ?? []),
        input.weight_kg ?? null,
        input.condition ?? 'new',
      ]
    );
    return rows[0]!;
  },

  async update(id: string, input: UpdateProductInput): Promise<Product | null> {
    const fields: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    const fieldMap: [keyof UpdateProductInput, string][] = [
      ['name', 'name'],
      ['description', 'description'],
      ['sku', 'sku'],
      ['category', 'category'],
      ['unit', 'unit'],
      ['price_cents', 'price_cents'],
      ['stock', 'stock'],
      ['weight_kg', 'weight_kg'],
      ['condition', 'condition'],
      ['is_active', 'is_active'],
    ];

    for (const [key, col] of fieldMap) {
      if (input[key] !== undefined) {
        fields.push(`${col} = $${idx++}`);
        values.push(input[key]);
      }
    }

    if (input.image_urls !== undefined) {
      fields.push(`image_urls = $${idx++}`);
      values.push(JSON.stringify(input.image_urls));
    }

    if (fields.length === 0) return this.findById(id);

    fields.push(`updated_at = NOW()`);
    values.push(id);

    const { rows } = await pool.query<Product>(
      `UPDATE products SET ${fields.join(', ')} WHERE id = $${idx} AND deleted_at IS NULL RETURNING *`,
      values
    );
    return rows[0] ?? null;
  },

  /** Decrement stock atomically, returns false if insufficient */
  async decrementStock(id: string, quantity: number): Promise<boolean> {
    const { rowCount } = await pool.query(
      `UPDATE products SET stock = stock - $1, updated_at = NOW()
       WHERE id = $2 AND deleted_at IS NULL AND stock >= $1`,
      [quantity, id]
    );
    return (rowCount ?? 0) > 0;
  },

  /** Restore stock (e.g. after failed payment) */
  async incrementStock(id: string, quantity: number): Promise<void> {
    await pool.query(
      `UPDATE products SET stock = stock + $1, updated_at = NOW() WHERE id = $2`,
      [quantity, id]
    );
  },

  async softDelete(id: string): Promise<void> {
    await pool.query(
      'UPDATE products SET deleted_at = NOW() WHERE id = $1',
      [id]
    );
  },
};

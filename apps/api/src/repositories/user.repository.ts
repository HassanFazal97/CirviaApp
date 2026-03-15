import { pool } from '../db';
import { User, UserRole } from '@cirvia/types';

export interface CreateUserInput {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  phone?: string;
  avatar_url?: string;
}

export interface UpdateUserInput {
  full_name?: string;
  phone?: string;
  avatar_url?: string;
  push_token?: string;
}

export const userRepository = {
  async findById(id: string): Promise<User | null> {
    const { rows } = await pool.query<User>(
      'SELECT * FROM users WHERE id = $1 AND deleted_at IS NULL',
      [id]
    );
    return rows[0] ?? null;
  },

  async findByEmail(email: string): Promise<User | null> {
    const { rows } = await pool.query<User>(
      'SELECT * FROM users WHERE email = $1 AND deleted_at IS NULL',
      [email]
    );
    return rows[0] ?? null;
  },

  async create(input: CreateUserInput): Promise<User> {
    const { rows } = await pool.query<User>(
      `INSERT INTO users (id, email, full_name, role, phone, avatar_url)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        input.id,
        input.email,
        input.full_name,
        input.role,
        input.phone ?? null,
        input.avatar_url ?? null,
      ]
    );
    return rows[0]!;
  },

  async update(id: string, input: UpdateUserInput): Promise<User | null> {
    const fields: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (input.full_name !== undefined) {
      fields.push(`full_name = $${idx++}`);
      values.push(input.full_name);
    }
    if (input.phone !== undefined) {
      fields.push(`phone = $${idx++}`);
      values.push(input.phone);
    }
    if (input.avatar_url !== undefined) {
      fields.push(`avatar_url = $${idx++}`);
      values.push(input.avatar_url);
    }
    if (input.push_token !== undefined) {
      fields.push(`push_token = $${idx++}`);
      values.push(input.push_token);
    }

    if (fields.length === 0) return this.findById(id);

    fields.push(`updated_at = NOW()`);
    values.push(id);

    const { rows } = await pool.query<User>(
      `UPDATE users SET ${fields.join(', ')} WHERE id = $${idx} AND deleted_at IS NULL RETURNING *`,
      values
    );
    return rows[0] ?? null;
  },
};

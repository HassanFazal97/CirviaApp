import { pool } from '../db';
import { Payout, PayoutRecipientType, PayoutStatus } from '@cirvia/types';

export interface CreatePayoutInput {
  id: string;
  recipient_type: PayoutRecipientType;
  recipient_id: string;
  order_id: string;
  amount_cents: number;
}

export const payoutRepository = {
  async create(input: CreatePayoutInput): Promise<Payout> {
    const { rows } = await pool.query<Payout>(
      `INSERT INTO payouts (id, recipient_type, recipient_id, order_id, amount_cents)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [
        input.id,
        input.recipient_type,
        input.recipient_id,
        input.order_id,
        input.amount_cents,
      ]
    );
    return rows[0]!;
  },

  async updateStatus(
    id: string,
    status: PayoutStatus,
    stripe_transfer_id?: string
  ): Promise<Payout | null> {
    const { rows } = await pool.query<Payout>(
      `UPDATE payouts
       SET status = $1,
           stripe_transfer_id = COALESCE($2, stripe_transfer_id),
           paid_at = CASE WHEN $1 = 'paid' THEN NOW() ELSE paid_at END,
           updated_at = NOW()
       WHERE id = $3 RETURNING *`,
      [status, stripe_transfer_id ?? null, id]
    );
    return rows[0] ?? null;
  },

  async findByRecipient(
    recipient_type: PayoutRecipientType,
    recipient_id: string,
    opts: { limit?: number; offset?: number } = {}
  ): Promise<{ data: Payout[]; total: number }> {
    const limit = opts.limit ?? 20;
    const offset = opts.offset ?? 0;

    const [{ rows: data }, { rows: countRows }] = await Promise.all([
      pool.query<Payout>(
        `SELECT * FROM payouts
         WHERE recipient_type = $1 AND recipient_id = $2
         ORDER BY created_at DESC LIMIT $3 OFFSET $4`,
        [recipient_type, recipient_id, limit, offset]
      ),
      pool.query<{ count: string }>(
        'SELECT COUNT(*) FROM payouts WHERE recipient_type = $1 AND recipient_id = $2',
        [recipient_type, recipient_id]
      ),
    ]);

    return { data, total: parseInt(countRows[0]?.count ?? '0', 10) };
  },
};

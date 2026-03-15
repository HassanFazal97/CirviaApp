import { pool } from '../db';
import { Review, ReviewTargetType } from '@cirvia/types';

export interface CreateReviewInput {
  id: string;
  order_id: string;
  reviewer_id: string;
  target_type: ReviewTargetType;
  target_id: string;
  rating: 1 | 2 | 3 | 4 | 5;
  comment?: string;
}

export const reviewRepository = {
  async create(input: CreateReviewInput): Promise<Review> {
    const { rows } = await pool.query<Review>(
      `INSERT INTO reviews (id, order_id, reviewer_id, target_type, target_id, rating, comment)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        input.id,
        input.order_id,
        input.reviewer_id,
        input.target_type,
        input.target_id,
        input.rating,
        input.comment ?? null,
      ]
    );
    return rows[0]!;
  },

  async getAverageRating(
    target_type: ReviewTargetType,
    target_id: string
  ): Promise<{ avg: number; count: number }> {
    const { rows } = await pool.query<{ avg: string; count: string }>(
      `SELECT AVG(rating) as avg, COUNT(*) as count
       FROM reviews WHERE target_type = $1 AND target_id = $2`,
      [target_type, target_id]
    );
    return {
      avg: parseFloat(rows[0]?.avg ?? '0'),
      count: parseInt(rows[0]?.count ?? '0', 10),
    };
  },
};

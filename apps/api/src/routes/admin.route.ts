import { FastifyPluginAsync } from 'fastify';
import { pool } from '../db';
import { userRepository } from '../repositories/user.repository';
import { storeRepository } from '../repositories/store.repository';
import { orderRepository } from '../repositories/order.repository';
import { driverRepository } from '../repositories/driver.repository';
import { payoutRepository } from '../repositories/payout.repository';
import {
  User,
  Store,
  Order,
  OrderStatus,
  Driver,
  DriverStatus,
  Payout,
  PayoutStatus,
  Review,
} from '@cirvia/types';

const adminRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /admin/users — paginated list of all users
  fastify.get('/admin/users', { preHandler: [fastify.requireRole('admin')] }, async (req, reply) => {
    const query = req.query as { limit?: string; offset?: string };
    const limit = query.limit ? parseInt(query.limit, 10) : 20;
    const offset = query.offset ? parseInt(query.offset, 10) : 0;

    const [{ rows: data }, { rows: countRows }] = await Promise.all([
      pool.query<User>(
        `SELECT * FROM users WHERE deleted_at IS NULL ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
        [limit, offset]
      ),
      pool.query<{ count: string }>('SELECT COUNT(*) FROM users WHERE deleted_at IS NULL'),
    ]);

    return reply.send({ data, total: parseInt(countRows[0]?.count ?? '0', 10) });
  });

  // GET /admin/stores — paginated list of all stores
  fastify.get('/admin/stores', { preHandler: [fastify.requireRole('admin')] }, async (req, reply) => {
    const query = req.query as { limit?: string; offset?: string };
    const limit = query.limit ? parseInt(query.limit, 10) : 20;
    const offset = query.offset ? parseInt(query.offset, 10) : 0;

    const [{ rows: data }, { rows: countRows }] = await Promise.all([
      pool.query<Store>(
        `SELECT * FROM stores WHERE deleted_at IS NULL ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
        [limit, offset]
      ),
      pool.query<{ count: string }>('SELECT COUNT(*) FROM stores WHERE deleted_at IS NULL'),
    ]);

    return reply.send({ data, total: parseInt(countRows[0]?.count ?? '0', 10) });
  });

  // GET /admin/orders — all orders with optional status filter
  fastify.get('/admin/orders', { preHandler: [fastify.requireRole('admin')] }, async (req, reply) => {
    const query = req.query as { limit?: string; offset?: string; status?: string };
    const limit = query.limit ? parseInt(query.limit, 10) : 20;
    const offset = query.offset ? parseInt(query.offset, 10) : 0;

    const params: unknown[] = [limit, offset];
    let statusClause = '';
    if (query.status) {
      params.push(query.status);
      statusClause = `AND status = $${params.length}`;
    }

    const [{ rows: data }, { rows: countRows }] = await Promise.all([
      pool.query<Order>(
        `SELECT * FROM orders WHERE deleted_at IS NULL ${statusClause} ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
        params
      ),
      pool.query<{ count: string }>(
        `SELECT COUNT(*) FROM orders WHERE deleted_at IS NULL ${statusClause}`,
        query.status ? [query.status] : []
      ),
    ]);

    return reply.send({ data, total: parseInt(countRows[0]?.count ?? '0', 10) });
  });

  // GET /admin/drivers — all drivers with optional status filter
  fastify.get('/admin/drivers', { preHandler: [fastify.requireRole('admin')] }, async (req, reply) => {
    const query = req.query as { limit?: string; offset?: string; status?: string };
    const limit = query.limit ? parseInt(query.limit, 10) : 20;
    const offset = query.offset ? parseInt(query.offset, 10) : 0;

    const params: unknown[] = [limit, offset];
    let statusClause = '';
    if (query.status) {
      params.push(query.status);
      statusClause = `AND status = $${params.length}`;
    }

    const [{ rows: data }, { rows: countRows }] = await Promise.all([
      pool.query<Driver>(
        `SELECT * FROM drivers WHERE deleted_at IS NULL ${statusClause} ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
        params
      ),
      pool.query<{ count: string }>(
        `SELECT COUNT(*) FROM drivers WHERE deleted_at IS NULL ${statusClause}`,
        query.status ? [query.status] : []
      ),
    ]);

    return reply.send({ data, total: parseInt(countRows[0]?.count ?? '0', 10) });
  });

  // GET /admin/payouts — all payouts with optional status filter
  fastify.get('/admin/payouts', { preHandler: [fastify.requireRole('admin')] }, async (req, reply) => {
    const query = req.query as { limit?: string; offset?: string; status?: string };
    const limit = query.limit ? parseInt(query.limit, 10) : 20;
    const offset = query.offset ? parseInt(query.offset, 10) : 0;

    const params: unknown[] = [limit, offset];
    let statusClause = '';
    if (query.status) {
      params.push(query.status);
      statusClause = `AND status = $${params.length}`;
    }

    const [{ rows: data }, { rows: countRows }] = await Promise.all([
      pool.query<Payout>(
        `SELECT * FROM payouts WHERE 1=1 ${statusClause} ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
        params
      ),
      pool.query<{ count: string }>(
        `SELECT COUNT(*) FROM payouts WHERE 1=1 ${statusClause}`,
        query.status ? [query.status] : []
      ),
    ]);

    return reply.send({ data, total: parseInt(countRows[0]?.count ?? '0', 10) });
  });

  // GET /admin/reviews — all reviews
  fastify.get('/admin/reviews', { preHandler: [fastify.requireRole('admin')] }, async (req, reply) => {
    const query = req.query as { limit?: string; offset?: string };
    const limit = query.limit ? parseInt(query.limit, 10) : 20;
    const offset = query.offset ? parseInt(query.offset, 10) : 0;

    const [{ rows: data }, { rows: countRows }] = await Promise.all([
      pool.query<Review>(
        `SELECT * FROM reviews ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
        [limit, offset]
      ),
      pool.query<{ count: string }>('SELECT COUNT(*) FROM reviews'),
    ]);

    return reply.send({ data, total: parseInt(countRows[0]?.count ?? '0', 10) });
  });

  // PATCH /admin/drivers/:id/verify — toggle is_verified
  fastify.patch('/admin/drivers/:id/verify', { preHandler: [fastify.requireRole('admin')] }, async (req, reply) => {
    const { id } = req.params as { id: string };

    const { rows } = await pool.query<Driver>(
      `UPDATE drivers
       SET is_verified = NOT is_verified, updated_at = NOW()
       WHERE id = $1 AND deleted_at IS NULL
       RETURNING *`,
      [id]
    );

    if (!rows[0]) {
      return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'Driver not found' });
    }

    return reply.send({ driver: rows[0] });
  });

  // PATCH /admin/stores/:id/active — toggle is_active
  fastify.patch('/admin/stores/:id/active', { preHandler: [fastify.requireRole('admin')] }, async (req, reply) => {
    const { id } = req.params as { id: string };

    const { rows } = await pool.query<Store>(
      `UPDATE stores
       SET is_active = NOT is_active, updated_at = NOW()
       WHERE id = $1 AND deleted_at IS NULL
       RETURNING *`,
      [id]
    );

    if (!rows[0]) {
      return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'Store not found' });
    }

    return reply.send({ store: rows[0] });
  });
};

export default adminRoutes;

import { FastifyPluginAsync } from 'fastify';
import { v4 as uuidv4 } from 'uuid';
import { driverRepository } from '../repositories/driver.repository';
import { orderRepository } from '../repositories/order.repository';
import { acquireLock, releaseLock, TTL } from '../redis';
import {
  createDriverSchema,
  updateLocationSchema,
  updateDeliveryStatusSchema,
} from '../schemas/driver.schema';
import { getSocketServer } from '../websocket/socket.server';
import { calculatePayoutSplits } from '@cirvia/utils';

const driversRoutes: FastifyPluginAsync = async (fastify) => {
  // POST /drivers — register as driver (buyer can become driver)
  fastify.post('/', { preHandler: [fastify.authenticate] }, async (req, reply) => {
    const body = createDriverSchema.safeParse(req.body);
    if (!body.success) {
      return reply.status(400).send({ statusCode: 400, error: 'Bad Request', message: body.error.message });
    }

    const existing = await driverRepository.findByUserId(req.user.sub);
    if (existing) {
      return reply.status(409).send({ statusCode: 409, error: 'Conflict', message: 'Driver profile already exists' });
    }

    const driver = await driverRepository.create({
      id: uuidv4(),
      user_id: req.user.sub,
      ...body.data,
    });

    return reply.status(201).send({ driver });
  });

  // GET /deliveries/available — nearby jobs for online driver
  fastify.get('/deliveries/available', { preHandler: [fastify.requireRole('driver')] }, async (req, reply) => {
    const query = req.query as { lat: string; lng: string; radius?: string };
    const lat = parseFloat(query.lat);
    const lng = parseFloat(query.lng);

    if (isNaN(lat) || isNaN(lng)) {
      return reply.status(400).send({ statusCode: 400, error: 'Bad Request', message: 'lat and lng are required' });
    }

    const deliveries = await driverRepository.findAvailableNearby(
      lat,
      lng,
      query.radius ? parseInt(query.radius, 10) : 5_000
    );

    return reply.send({ data: deliveries });
  });

  // POST /deliveries/:id/accept — acquire 30s Redis lock
  fastify.post('/deliveries/:id/accept', { preHandler: [fastify.requireRole('driver')] }, async (req, reply) => {
    const { id } = req.params as { id: string };

    const driver = await driverRepository.findByUserId(req.user.sub);
    if (!driver) {
      return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'Driver profile not found' });
    }

    const locked = await acquireLock(`delivery:${id}`, TTL.DRIVER_JOB_LOCK);
    if (!locked) {
      return reply.status(409).send({ statusCode: 409, error: 'Conflict', message: 'Delivery is already being accepted by another driver' });
    }

    try {
      const delivery = await driverRepository.assignDriver(id, driver.id);
      if (!delivery) {
        await releaseLock(`delivery:${id}`);
        return reply.status(409).send({ statusCode: 409, error: 'Conflict', message: 'Delivery is no longer available' });
      }

      await driverRepository.updateStatus(driver.id, 'on_delivery');

      // Notify buyer via WebSocket
      const io = getSocketServer();
      if (io && delivery.order_id) {
        io.to(`order:${delivery.order_id}`).emit('order:status_update', {
          order_id: delivery.order_id,
          status: 'in_transit',
          updated_at: new Date().toISOString(),
        });
      }

      return reply.send({ delivery });
    } catch (err) {
      await releaseLock(`delivery:${id}`);
      throw err;
    }
  });

  // PATCH /deliveries/:id/status
  fastify.patch('/deliveries/:id/status', { preHandler: [fastify.requireRole('driver')] }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = updateDeliveryStatusSchema.safeParse(req.body);
    if (!body.success) {
      return reply.status(400).send({ statusCode: 400, error: 'Bad Request', message: body.error.message });
    }

    const extras: { pickup_at?: Date; delivered_at?: Date } = {};
    if (body.data.status === 'picked_up') extras.pickup_at = new Date();
    if (body.data.status === 'delivered') extras.delivered_at = new Date();

    const delivery = await driverRepository.updateDeliveryStatus(id, body.data.status, extras);
    if (!delivery) {
      return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'Delivery not found' });
    }

    // Update order status
    if (body.data.status === 'delivered') {
      await orderRepository.updateStatus(delivery.order_id, 'delivered');
    }

    // Notify buyer
    const io = getSocketServer();
    if (io) {
      io.to(`order:${delivery.order_id}`).emit('order:status_update', {
        order_id: delivery.order_id,
        status: body.data.status === 'delivered' ? 'delivered' : 'in_transit',
        updated_at: new Date().toISOString(),
      });
    }

    return reply.send({ delivery });
  });

  // PATCH /drivers/location — GPS update
  fastify.patch('/location', { preHandler: [fastify.requireRole('driver')] }, async (req, reply) => {
    const body = updateLocationSchema.safeParse(req.body);
    if (!body.success) {
      return reply.status(400).send({ statusCode: 400, error: 'Bad Request', message: body.error.message });
    }

    const driver = await driverRepository.findByUserId(req.user.sub);
    if (!driver) {
      return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'Driver profile not found' });
    }

    await driverRepository.updateLocation(driver.id, body.data.lat, body.data.lng);

    return reply.status(204).send();
  });

  // GET /drivers/earnings
  fastify.get('/earnings', { preHandler: [fastify.requireRole('driver')] }, async (req, reply) => {
    const driver = await driverRepository.findByUserId(req.user.sub);
    if (!driver) {
      return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'Driver profile not found' });
    }

    const { pool } = await import('../db');
    const { rows } = await pool.query(
      `SELECT
         COUNT(*) as total_deliveries,
         COALESCE(SUM(driver_fee_cents), 0) as total_earned_cents,
         COALESCE(SUM(CASE WHEN delivered_at >= NOW() - INTERVAL '7 days' THEN driver_fee_cents ELSE 0 END), 0) as last_7_days_cents
       FROM deliveries
       WHERE driver_id = $1 AND status = 'delivered'`,
      [driver.id]
    );

    return reply.send({ earnings: rows[0] });
  });
};

export default driversRoutes;

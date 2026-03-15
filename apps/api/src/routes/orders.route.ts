import { FastifyPluginAsync } from 'fastify';
import { orderService } from '../services/order.service';
import { orderRepository } from '../repositories/order.repository';
import { stripeService } from '../services/stripe.service';
import { createOrderSchema } from '../schemas/order.schema';

const ordersRoutes: FastifyPluginAsync = async (fastify) => {
  // POST /orders — buyer creates order
  fastify.post('/', { preHandler: [fastify.authenticate] }, async (req, reply) => {
    const body = createOrderSchema.safeParse(req.body);
    if (!body.success) {
      return reply.status(400).send({ statusCode: 400, error: 'Bad Request', message: body.error.message });
    }

    try {
      const result = await orderService.createOrder({
        buyer_id: req.user.sub,
        store_id: body.data.store_id,
        items: body.data.items,
        delivery_address: body.data.delivery_address,
        delivery_notes: body.data.delivery_notes,
      });

      return reply.status(201).send(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create order';
      return reply.status(422).send({ statusCode: 422, error: 'Unprocessable Entity', message });
    }
  });

  // GET /orders — buyer's order history
  fastify.get('/', { preHandler: [fastify.authenticate] }, async (req, reply) => {
    const query = req.query as { limit?: string; offset?: string };
    const { data, total } = await orderRepository.findByBuyer(req.user.sub, {
      limit: query.limit ? parseInt(query.limit, 10) : 20,
      offset: query.offset ? parseInt(query.offset, 10) : 0,
    });
    return reply.send({ data, total });
  });

  // GET /orders/:id
  fastify.get('/:id', { preHandler: [fastify.authenticate] }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const order = await orderRepository.findById(id);
    if (!order) {
      return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'Order not found' });
    }

    // Only buyer, store owner, or admin can view
    if (order.buyer_id !== req.user.sub && req.user.role !== 'admin' && req.user.role !== 'store_owner') {
      return reply.status(403).send({ statusCode: 403, error: 'Forbidden', message: 'Access denied' });
    }

    const items = await orderRepository.getItems(id);
    return reply.send({ order, items });
  });

  // POST /orders/webhook — Stripe webhook handler (no auth, raw body needed)
  fastify.post(
    '/webhook',
    {
      config: { rawBody: true },
      onRequest: [], // no JWT middleware
    },
    async (req, reply) => {
      const sig = req.headers['stripe-signature'];
      if (!sig) {
        return reply.status(400).send({ error: 'Missing stripe-signature header' });
      }

      let event;
      try {
        // rawBody populated by @fastify/rawbody plugin
        event = stripeService.constructWebhookEvent(
          (req as unknown as { rawBody: Buffer }).rawBody,
          sig as string
        );
      } catch {
        return reply.status(400).send({ error: 'Invalid webhook signature' });
      }

      switch (event.type) {
        case 'payment_intent.succeeded': {
          const pi = event.data.object as { id: string };
          await orderService.confirmPayment(pi.id);
          break;
        }
        case 'payment_intent.payment_failed': {
          const pi = event.data.object as { id: string };
          await orderService.handlePaymentFailed(pi.id);
          break;
        }
      }

      return reply.send({ received: true });
    }
  );
};

export default ordersRoutes;

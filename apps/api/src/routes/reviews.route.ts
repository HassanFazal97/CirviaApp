import { FastifyPluginAsync } from 'fastify';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { reviewRepository } from '../repositories/review.repository';
import { orderRepository } from '../repositories/order.repository';

const createReviewSchema = z.object({
  order_id: z.string().uuid(),
  target_type: z.enum(['store', 'driver']),
  target_id: z.string().uuid(),
  rating: z.number().int().min(1).max(5) as z.ZodType<1 | 2 | 3 | 4 | 5>,
  comment: z.string().max(1000).optional(),
});

const reviewsRoutes: FastifyPluginAsync = async (fastify) => {
  // POST /reviews — buyer posts review after delivery
  fastify.post('/', { preHandler: [fastify.authenticate] }, async (req, reply) => {
    const body = createReviewSchema.safeParse(req.body);
    if (!body.success) {
      return reply.status(400).send({ statusCode: 400, error: 'Bad Request', message: body.error.message });
    }

    // Verify order belongs to this buyer and is delivered
    const order = await orderRepository.findById(body.data.order_id);
    if (!order || order.buyer_id !== req.user.sub) {
      return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'Order not found' });
    }
    if (order.status !== 'delivered') {
      return reply.status(422).send({ statusCode: 422, error: 'Unprocessable Entity', message: 'Can only review delivered orders' });
    }

    try {
      const review = await reviewRepository.create({
        id: uuidv4(),
        order_id: body.data.order_id,
        reviewer_id: req.user.sub,
        target_type: body.data.target_type,
        target_id: body.data.target_id,
        rating: body.data.rating,
        comment: body.data.comment,
      });

      return reply.status(201).send({ review });
    } catch (err) {
      const message = err instanceof Error && err.message.includes('unique')
        ? 'You have already reviewed this order'
        : 'Failed to create review';
      return reply.status(409).send({ statusCode: 409, error: 'Conflict', message });
    }
  });

  // GET /reviews/:targetType/:targetId/average
  fastify.get('/:targetType/:targetId/average', async (req, reply) => {
    const { targetType, targetId } = req.params as {
      targetType: 'store' | 'driver';
      targetId: string;
    };

    const stats = await reviewRepository.getAverageRating(targetType, targetId);
    return reply.send(stats);
  });
};

export default reviewsRoutes;

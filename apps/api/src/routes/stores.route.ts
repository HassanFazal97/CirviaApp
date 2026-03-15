import { FastifyPluginAsync } from 'fastify';
import { v4 as uuidv4 } from 'uuid';
import { storeRepository } from '../repositories/store.repository';
import { productRepository } from '../repositories/product.repository';
import { algoliaService } from '../services/algolia.service';
import {
  nearbyQuerySchema,
  createStoreSchema,
  updateStoreSchema,
  createProductSchema,
  updateProductSchema,
} from '../schemas/store.schema';

const storesRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /stores/nearby
  fastify.get('/nearby', async (req, reply) => {
    const query = nearbyQuerySchema.safeParse(req.query);
    if (!query.success) {
      return reply.status(400).send({ statusCode: 400, error: 'Bad Request', message: query.error.message });
    }

    const { lat, lng, radius, limit, offset } = query.data;
    const stores = await storeRepository.findNearby(lat, lng, radius, limit, offset);
    return reply.send({ data: stores, count: stores.length });
  });

  // GET /stores/:id
  fastify.get('/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const store = await storeRepository.findById(id);
    if (!store) {
      return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'Store not found' });
    }
    return reply.send({ store });
  });

  // GET /stores/:id/products
  fastify.get('/:id/products', async (req, reply) => {
    const { id } = req.params as { id: string };
    const query = req.query as { limit?: string; offset?: string };

    const store = await storeRepository.findById(id);
    if (!store) {
      return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'Store not found' });
    }

    const { data, total } = await productRepository.listByStore(id, {
      limit: query.limit ? parseInt(query.limit, 10) : 20,
      offset: query.offset ? parseInt(query.offset, 10) : 0,
    });

    return reply.send({
      data,
      total,
      page: Math.floor((parseInt(query.offset ?? '0', 10)) / (parseInt(query.limit ?? '20', 10))) + 1,
      limit: parseInt(query.limit ?? '20', 10),
      has_more: (parseInt(query.offset ?? '0', 10)) + data.length < total,
    });
  });

  // POST /stores — requires store_owner or admin
  fastify.post('/', { preHandler: [fastify.requireRole('store_owner', 'admin')] }, async (req, reply) => {
    const body = createStoreSchema.safeParse(req.body);
    if (!body.success) {
      return reply.status(400).send({ statusCode: 400, error: 'Bad Request', message: body.error.message });
    }

    const store = await storeRepository.create({
      id: uuidv4(),
      owner_id: req.user.sub,
      ...body.data,
    });

    // Index in Algolia
    await algoliaService.indexStore(store).catch((err) => {
      req.log.warn({ err }, 'Failed to index store in Algolia');
    });

    return reply.status(201).send({ store });
  });

  // PATCH /stores/:id
  fastify.patch('/:id', { preHandler: [fastify.requireRole('store_owner', 'admin')] }, async (req, reply) => {
    const { id } = req.params as { id: string };

    const store = await storeRepository.findById(id);
    if (!store) {
      return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'Store not found' });
    }

    // Only owner or admin can update
    if (store.owner_id !== req.user.sub && req.user.role !== 'admin') {
      return reply.status(403).send({ statusCode: 403, error: 'Forbidden', message: 'Not the store owner' });
    }

    const body = updateStoreSchema.safeParse(req.body);
    if (!body.success) {
      return reply.status(400).send({ statusCode: 400, error: 'Bad Request', message: body.error.message });
    }

    const updated = await storeRepository.update(id, body.data);
    if (updated) {
      await algoliaService.indexStore(updated).catch(() => {});
    }

    return reply.send({ store: updated });
  });

  // POST /stores/:id/products
  fastify.post('/:id/products', { preHandler: [fastify.requireRole('store_owner', 'admin')] }, async (req, reply) => {
    const { id } = req.params as { id: string };

    const store = await storeRepository.findById(id);
    if (!store) {
      return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'Store not found' });
    }

    if (store.owner_id !== req.user.sub && req.user.role !== 'admin') {
      return reply.status(403).send({ statusCode: 403, error: 'Forbidden', message: 'Not the store owner' });
    }

    const body = createProductSchema.safeParse(req.body);
    if (!body.success) {
      return reply.status(400).send({ statusCode: 400, error: 'Bad Request', message: body.error.message });
    }

    const product = await productRepository.create({
      id: uuidv4(),
      store_id: id,
      ...body.data,
    });

    await algoliaService.indexProduct(product).catch(() => {});

    return reply.status(201).send({ product });
  });
};

export default storesRoutes;

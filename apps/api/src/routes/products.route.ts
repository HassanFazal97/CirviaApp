import { FastifyPluginAsync } from 'fastify';
import { productRepository } from '../repositories/product.repository';
import { algoliaService } from '../services/algolia.service';
import { updateProductSchema } from '../schemas/store.schema';
import { storeRepository } from '../repositories/store.repository';

const productsRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /products/search — Algolia proxy
  fastify.get('/search', async (req, reply) => {
    const query = req.query as {
      q?: string;
      store_id?: string;
      category?: string;
      condition?: string;
    };

    const results = await algoliaService.searchProducts(query.q ?? '', {
      store_id: query.store_id,
      category: query.category,
      condition: query.condition,
    });

    return reply.send({
      hits: results.hits,
      nbHits: results.nbHits,
      page: results.page,
      nbPages: results.nbPages,
      query: query.q,
    });
  });

  // GET /products/:id
  fastify.get('/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const product = await productRepository.findById(id);
    if (!product) {
      return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'Product not found' });
    }
    return reply.send({ product });
  });

  // PATCH /products/:id
  fastify.patch('/:id', { preHandler: [fastify.requireRole('store_owner', 'admin')] }, async (req, reply) => {
    const { id } = req.params as { id: string };

    const product = await productRepository.findById(id);
    if (!product) {
      return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'Product not found' });
    }

    // Verify ownership through store
    const store = await storeRepository.findById(product.store_id);
    if (store?.owner_id !== req.user.sub && req.user.role !== 'admin') {
      return reply.status(403).send({ statusCode: 403, error: 'Forbidden', message: 'Not the store owner' });
    }

    const body = updateProductSchema.safeParse(req.body);
    if (!body.success) {
      return reply.status(400).send({ statusCode: 400, error: 'Bad Request', message: body.error.message });
    }

    const updated = await productRepository.update(id, body.data);
    if (updated) {
      await algoliaService.indexProduct(updated).catch(() => {});
    }

    return reply.send({ product: updated });
  });

  // DELETE /products/:id — soft delete
  fastify.delete('/:id', { preHandler: [fastify.requireRole('store_owner', 'admin')] }, async (req, reply) => {
    const { id } = req.params as { id: string };

    const product = await productRepository.findById(id);
    if (!product) {
      return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'Product not found' });
    }

    const store = await storeRepository.findById(product.store_id);
    if (store?.owner_id !== req.user.sub && req.user.role !== 'admin') {
      return reply.status(403).send({ statusCode: 403, error: 'Forbidden', message: 'Not the store owner' });
    }

    await productRepository.softDelete(id);
    await algoliaService.removeProduct(id).catch(() => {});

    return reply.status(204).send();
  });
};

export default productsRoutes;

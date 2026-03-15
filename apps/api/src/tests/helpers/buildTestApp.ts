/**
 * Creates a fresh Fastify instance for each test, bypassing the singleton
 * pattern and module-level start() call in server.ts. This prevents the
 * "Plugin already registered" errors that occur when buildApp() is called
 * multiple times on the same Fastify singleton.
 */
import Fastify from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import { config } from '../../config';
import authPlugin from '../../plugins/auth.plugin';
import correlationPlugin from '../../plugins/correlation.plugin';
import swaggerPlugin from '../../plugins/swagger.plugin';
import authRoutes from '../../routes/auth.route';
import storesRoutes from '../../routes/stores.route';
import productsRoutes from '../../routes/products.route';
import ordersRoutes from '../../routes/orders.route';
import driversRoutes from '../../routes/drivers.route';
import reviewsRoutes from '../../routes/reviews.route';
import adminRoutes from '../../routes/admin.route';

export async function buildTestApp() {
  const fastify = Fastify({ logger: false });

  await fastify.register(cors, { origin: config.CORS_ORIGIN });
  await fastify.register(multipart, { limits: { fileSize: 10 * 1024 * 1024 } });
  await fastify.register(correlationPlugin);
  await fastify.register(swaggerPlugin);
  await fastify.register(authPlugin);

  await fastify.register(
    async (v1) => {
      v1.register(authRoutes, { prefix: '/auth' });
      v1.register(storesRoutes, { prefix: '/stores' });
      v1.register(productsRoutes, { prefix: '/products' });
      v1.register(ordersRoutes, { prefix: '/orders' });
      v1.register(driversRoutes, { prefix: '/drivers' });
      v1.register(reviewsRoutes, { prefix: '/reviews' });
    },
    { prefix: '/api/v1' }
  );

  fastify.register(adminRoutes, { prefix: '/api/v1' });
  fastify.get('/health', async () => ({ status: 'ok', ts: new Date().toISOString() }));

  return fastify;
}

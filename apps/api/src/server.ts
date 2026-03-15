import { createServer } from 'http';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import multipart from '@fastify/multipart';

import { config } from './config';
import { redis } from './redis';
import { initSocketServer } from './websocket/socket.server';
import { stockRestoreWorker } from './queues/stock.queue';

// Plugins
import authPlugin from './plugins/auth.plugin';
import swaggerPlugin from './plugins/swagger.plugin';
import correlationPlugin from './plugins/correlation.plugin';

// Routes
import authRoutes from './routes/auth.route';
import storesRoutes from './routes/stores.route';
import productsRoutes from './routes/products.route';
import ordersRoutes from './routes/orders.route';
import driversRoutes from './routes/drivers.route';
import reviewsRoutes from './routes/reviews.route';

const fastify = Fastify({
  logger: {
    level: config.NODE_ENV === 'production' ? 'info' : 'debug',
    transport:
      config.NODE_ENV !== 'production'
        ? { target: 'pino-pretty', options: { colorize: true } }
        : undefined,
  },
  trustProxy: true,
});

async function buildApp() {
  // Core plugins
  await fastify.register(cors, { origin: config.CORS_ORIGIN });
  await fastify.register(rateLimit, {
    global: true,
    max: 100,
    timeWindow: '1 minute',
    redis,
  });
  await fastify.register(multipart, { limits: { fileSize: 10 * 1024 * 1024 } }); // 10 MB
  await fastify.register(correlationPlugin);
  await fastify.register(swaggerPlugin);
  await fastify.register(authPlugin);

  // API v1 routes
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

  // Health check
  fastify.get('/health', async () => ({ status: 'ok', ts: new Date().toISOString() }));

  return fastify;
}

async function start() {
  try {
    const app = await buildApp();

    // Create raw HTTP server so Socket.io can share it
    const httpServer = createServer(app.server);
    initSocketServer(httpServer);

    await app.ready();

    const port = config.PORT;
    await new Promise<void>((resolve, reject) => {
      httpServer.listen(port, '0.0.0.0', (err?: Error) => {
        if (err) reject(err);
        else resolve();
      });
    });

    console.log(`🚀 Cirvia API running on http://0.0.0.0:${port}`);
    console.log(`📚 Swagger docs: http://localhost:${port}/docs`);
    console.log(`🔌 WebSocket server ready`);

    // Graceful shutdown
    const shutdown = async () => {
      console.log('Shutting down...');
      await stockRestoreWorker.close();
      await redis.quit();
      await app.close();
      process.exit(0);
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

start();

export { buildApp };

import fp from 'fastify-plugin';
import { FastifyPluginAsync } from 'fastify';
import { v4 as uuidv4 } from 'uuid';

const correlationPlugin: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('onRequest', async (req) => {
    const correlationId =
      (req.headers['x-correlation-id'] as string) ?? uuidv4();
    req.headers['x-correlation-id'] = correlationId;
    req.log = req.log.child({ correlationId });
  });

  fastify.addHook('onSend', async (req, reply) => {
    const correlationId = req.headers['x-correlation-id'];
    if (correlationId) {
      reply.header('x-correlation-id', correlationId);
    }
  });
};

export default fp(correlationPlugin, { name: 'correlation' });

import { FastifyPluginAsync } from 'fastify';
import { authService } from '../services/auth.service';
import { userRepository } from '../repositories/user.repository';
import {
  registerBodySchema,
  loginBodySchema,
  refreshBodySchema,
  logoutBodySchema,
  updateProfileBodySchema,
} from '../schemas/auth.schema';

const authRoutes: FastifyPluginAsync = async (fastify) => {
  // POST /auth/register
  fastify.post('/register', async (req, reply) => {
    const body = registerBodySchema.safeParse(req.body);
    if (!body.success) {
      return reply.status(400).send({ statusCode: 400, error: 'Bad Request', message: body.error.message });
    }

    try {
      const result = await authService.register(fastify, body.data);
      return reply.status(201).send(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Registration failed';
      return reply.status(422).send({ statusCode: 422, error: 'Unprocessable Entity', message });
    }
  });

  // POST /auth/login
  fastify.post('/login', async (req, reply) => {
    const body = loginBodySchema.safeParse(req.body);
    if (!body.success) {
      return reply.status(400).send({ statusCode: 400, error: 'Bad Request', message: body.error.message });
    }

    try {
      const result = await authService.login(fastify, body.data);
      return reply.send(result);
    } catch {
      return reply.status(401).send({ statusCode: 401, error: 'Unauthorized', message: 'Invalid email or password' });
    }
  });

  // POST /auth/refresh
  fastify.post('/refresh', async (req, reply) => {
    const body = refreshBodySchema.safeParse(req.body);
    if (!body.success) {
      return reply.status(400).send({ statusCode: 400, error: 'Bad Request', message: body.error.message });
    }

    try {
      const tokens = await authService.refresh(fastify, body.data.refresh_token);
      return reply.send({ tokens });
    } catch {
      return reply.status(401).send({ statusCode: 401, error: 'Unauthorized', message: 'Invalid or expired refresh token' });
    }
  });

  // POST /auth/logout
  fastify.post('/logout', async (req, reply) => {
    const body = logoutBodySchema.safeParse(req.body);
    if (!body.success) {
      return reply.status(400).send({ statusCode: 400, error: 'Bad Request', message: body.error.message });
    }

    await authService.logout(body.data.refresh_token);
    return reply.status(204).send();
  });

  // GET /auth/me
  fastify.get('/me', { preHandler: [fastify.authenticate] }, async (req, reply) => {
    const user = await userRepository.findById(req.user.sub);
    if (!user) {
      return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'User not found' });
    }
    return reply.send({ user });
  });

  // PATCH /auth/me
  fastify.patch('/me', { preHandler: [fastify.authenticate] }, async (req, reply) => {
    const body = updateProfileBodySchema.safeParse(req.body);
    if (!body.success) {
      return reply.status(400).send({ statusCode: 400, error: 'Bad Request', message: body.error.message });
    }

    const user = await userRepository.update(req.user.sub, body.data);
    if (!user) {
      return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'User not found' });
    }
    return reply.send({ user });
  });
};

export default authRoutes;

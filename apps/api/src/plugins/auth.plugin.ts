import fp from 'fastify-plugin';
import jwt from '@fastify/jwt';
import { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import { config } from '../config';
import { UserRole } from '@cirvia/types';

export interface JwtPayload {
  sub: string; // user ID
  email: string;
  role: UserRole;
  iat: number;
  exp: number;
}

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
    requireRole: (
      ...roles: UserRole[]
    ) => (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
  interface FastifyRequest {
    user: JwtPayload;
  }
}

const authPlugin: FastifyPluginAsync = async (fastify) => {
  await fastify.register(jwt, {
    secret: config.JWT_SECRET,
    sign: { expiresIn: config.JWT_EXPIRES_IN },
  });

  fastify.decorate(
    'authenticate',
    async (req: FastifyRequest, reply: FastifyReply) => {
      try {
        await req.jwtVerify();
      } catch {
        reply.status(401).send({ statusCode: 401, error: 'Unauthorized', message: 'Invalid or expired token' });
      }
    }
  );

  fastify.decorate(
    'requireRole',
    (...roles: UserRole[]) =>
      async (req: FastifyRequest, reply: FastifyReply) => {
        try {
          await req.jwtVerify();
        } catch {
          return reply.status(401).send({ statusCode: 401, error: 'Unauthorized', message: 'Invalid or expired token' });
        }
        if (!roles.includes(req.user.role)) {
          return reply.status(403).send({ statusCode: 403, error: 'Forbidden', message: 'Insufficient permissions' });
        }
      }
  );
};

export default fp(authPlugin, { name: 'auth' });

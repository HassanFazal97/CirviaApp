import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../db';
import { redis, TTL } from '../redis';
import { userRepository } from '../repositories/user.repository';
import { User, UserRole, AuthTokens } from '@cirvia/types';
import { FastifyInstance } from 'fastify';

export interface RegisterInput {
  email: string;
  password: string;
  full_name: string;
  role: UserRole;
  phone?: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export const authService = {
  async register(
    fastify: FastifyInstance,
    input: RegisterInput
  ): Promise<{ user: User; tokens: AuthTokens }> {
    // Create auth user in Supabase
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: input.email,
      password: input.password,
      email_confirm: true,
    });

    if (authError || !authData.user) {
      throw new Error(authError?.message ?? 'Failed to create auth user');
    }

    // Create user profile in our DB
    const user = await userRepository.create({
      id: authData.user.id,
      email: input.email,
      full_name: input.full_name,
      role: input.role,
      phone: input.phone,
    });

    const tokens = await this.generateTokens(fastify, user);
    return { user, tokens };
  },

  async login(
    fastify: FastifyInstance,
    input: LoginInput
  ): Promise<{ user: User; tokens: AuthTokens }> {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: input.email,
      password: input.password,
    });

    if (error || !data.user) {
      throw new Error('Invalid email or password');
    }

    const user = await userRepository.findById(data.user.id);
    if (!user) {
      throw new Error('User profile not found');
    }

    const tokens = await this.generateTokens(fastify, user);
    return { user, tokens };
  },

  async refresh(
    fastify: FastifyInstance,
    refreshToken: string
  ): Promise<AuthTokens> {
    const userId = await redis.get(`refresh:${refreshToken}`);
    if (!userId) {
      throw new Error('Invalid or expired refresh token');
    }

    const user = await userRepository.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Rotate refresh token
    await redis.del(`refresh:${refreshToken}`);
    return this.generateTokens(fastify, user);
  },

  async logout(refreshToken: string): Promise<void> {
    await redis.del(`refresh:${refreshToken}`);
  },

  async generateTokens(fastify: FastifyInstance, user: User): Promise<AuthTokens> {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const access_token = fastify.jwt.sign(payload);
    const refresh_token = uuidv4();

    await redis.setex(`refresh:${refresh_token}`, TTL.REFRESH_TOKEN, user.id);

    return {
      access_token,
      refresh_token,
      expires_in: 15 * 60, // 15 minutes in seconds
    };
  },
};

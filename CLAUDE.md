# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Package Manager & Monorepo

This is a **Turborepo monorepo** using **pnpm 9** workspaces. Always use `pnpm` — never `npm` or `yarn`.

```bash
# Install all dependencies
pnpm install

# Run all apps in dev mode
pnpm dev

# Build all packages
pnpm build

# Lint all packages
pnpm lint

# Type-check all packages
pnpm typecheck

# Run all tests
pnpm test

# Format with Prettier
pnpm format
```

To run commands for a specific app/package:
```bash
pnpm --filter @cirvia/api dev
pnpm --filter @cirvia/store-web dev
pnpm --filter @cirvia/admin-web dev
pnpm --filter @cirvia/driver-app start
pnpm --filter @cirvia/buyer-app start

# Run a single test file (in the api package)
pnpm --filter @cirvia/api test src/services/orders.test.ts
```

## Architecture Overview

### Apps
| App | Path | Stack | Purpose |
|-----|------|-------|---------|
| `api` | `apps/api/` | Fastify 4 + PostgreSQL + Redis | Backend REST API + WebSocket server |
| `admin-web` | `apps/admin-web/` | Next.js 14 App Router | Internal admin dashboard |
| `store-web` | `apps/store-web/` | Next.js 14 App Router | Store owner dashboard |
| `buyer-app` | `apps/buyer-app/` | Expo (React Native) | Buyer mobile app |
| `driver-app` | `apps/driver-app/` | Expo (React Native) | Driver mobile app |

### Shared Packages
- `@cirvia/types` — TypeScript type definitions shared across all apps
- `@cirvia/utils` — Shared utility functions
- `@cirvia/api-client` — Typed API client used by web and mobile apps
- `@cirvia/ui` — Shared UI components
- `@cirvia/config` — Shared ESLint, Prettier, and TypeScript configs

### Backend (`apps/api/src/`)

Layered architecture:
- **`routes/`** — Fastify route handlers (auth, stores, products, orders, drivers, reviews)
- **`services/`** — Business logic (auth, orders, stripe, email, algolia)
- **`repositories/`** — Data access layer with raw SQL via `pg`
- **`schemas/`** — Zod validation schemas for request/response
- **`queues/`** — BullMQ async job processing
- **`websocket/`** — Socket.io for real-time updates (order status, driver location)
- **`plugins/`** — Fastify plugins (auth, swagger, correlation IDs)
- **`config.ts`** — Environment-driven configuration

Key third-party integrations: **Stripe** (payments + Connect payouts), **Algolia** (product search), **AWS S3** (image storage), **Resend** (email), **PostGIS** (geospatial queries).

### Domain Model

Core entities: Users (Buyers/Drivers/Store Owners/Admins), Stores, Products, Orders, Deliveries, Drivers, Reviews, Payouts.

**Order lifecycle**: `pending_payment → confirmed → preparing → ready → picked_up → delivered` (or `cancelled`/`refunded`)

**Payout split**: 15% platform fee, 20% driver, remainder to store.

**All monetary values are stored in cents (integers).**

Soft deletes use `deleted_at` nullable timestamps. Geospatial queries use PostGIS `st_dwithin`.

### Frontend Patterns

- **Web apps**: Next.js App Router with React Query for server state
- **Mobile apps**: Expo Router with Zustand for local state + React Query for server state
- **API responses**: Standardized `PaginatedResponse<T>` wrapper; errors use `ApiError` with `statusCode`

## Local Development Setup

Requires Docker for PostgreSQL (with PostGIS) and Redis:
```bash
docker compose -f infra/docker/docker-compose.yml up -d
```

Copy and populate environment variables:
```bash
cp .env.example .env
```

Required services to configure: PostgreSQL, Redis, Supabase, Stripe, Algolia, AWS S3, Resend, Google Maps API key, JWT secrets.

Database migrations are managed via Supabase CLI (`supabase/migrations/`).

## Testing

- Backend uses **Vitest** for unit and integration tests
- CI runs with real PostgreSQL + Redis services (no mocking of DB/cache)

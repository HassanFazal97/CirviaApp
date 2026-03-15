import { createClient } from '@supabase/supabase-js';
import { config } from './config';

// Server-side Supabase client using service role key (full DB access, API only)
export const supabase = createClient(
  config.SUPABASE_URL,
  config.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

// Raw PostgreSQL pool for complex queries (PostGIS, etc.)
import { Pool } from 'pg';

export const pool = new Pool({
  connectionString: config.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

pool.on('error', (err) => {
  console.error('PostgreSQL pool error:', err);
});

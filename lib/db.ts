import { Pool } from 'pg';

// Enable SSL for Supabase or when explicitly requested via env.
// Supabase pooled connections generally require SSL even in development.
const ssl = (() => {
  if (process.env.DATABASE_SSL === 'true') return { rejectUnauthorized: false } as const;
  if (process.env.DATABASE_URL && process.env.DATABASE_URL.includes('supabase.com')) {
    return { rejectUnauthorized: false } as const;
  }
  return process.env.NODE_ENV === 'production' ? ({ rejectUnauthorized: false } as const) : (false as const);
})();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl,
});

export { pool };
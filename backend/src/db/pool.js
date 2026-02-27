import pg from 'pg';

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Set RLS context on each connection checkout
pool.on('connect', (client) => {
  client.query("SET app.current_user_id = '00000000-0000-0000-0000-000000000000'");
});

/**
 * Execute a query with optional RLS user context.
 * @param {string} text - SQL query
 * @param {any[]} params - Query params
 * @param {string} [userId] - UUID for RLS context
 */
export async function query(text, params, userId) {
  const client = await pool.connect();
  try {
    if (userId) {
      await client.query(`SET app.current_user_id = '${userId}'`);
    }
    return await client.query(text, params);
  } finally {
    client.release();
  }
}

export default pool;

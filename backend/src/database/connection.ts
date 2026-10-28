import { Pool, PoolClient } from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load .env and .env.local from current dir and root
const envFiles = [
  path.resolve(process.cwd(), '.env.local'),
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), '..', '.env.local'),
  path.resolve(process.cwd(), '..', '.env'),
  path.resolve(__dirname, '..', '..', '.env.local'),
  path.resolve(__dirname, '..', '..', '.env'),
];

for (const envFile of envFiles) {
  if (fs.existsSync(envFile)) {
    dotenv.config({ path: envFile });
  }
}

const isNeonOrSsl = 
  process.env.NODE_ENV === 'production' || 
  process.env.DATABASE_URL?.includes('neon.tech') ||
  process.env.DATABASE_URL?.includes('sslmode=require');

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isNeonOrSsl ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('connect', () => {
  console.log('Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

// Helper function to execute queries
export const query = async (text: string, params?: any[]): Promise<any> => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    if (process.env.NODE_ENV !== 'production') {
      console.log('Executed query', { text: text.trim().split('\n')[0], duration, rows: res.rowCount });
    }
    return res;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
};

// Helper function to get a client from the pool
export const getClient = async (): Promise<PoolClient> => {
  return await pool.connect();
};

// Helper function to execute transactions
export const transaction = async (callback: (client: PoolClient) => Promise<any>) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

// Close the pool when the application shuts down
export const closePool = async () => {
  await pool.end();
};

export default pool;

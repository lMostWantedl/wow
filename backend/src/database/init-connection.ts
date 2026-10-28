import { Pool } from 'pg';
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
  process.env.DATABASE_URL?.includes('sslmode=require') ||
  process.env.DATABASE_URL_UNPOOLED?.includes('neon.tech');

// Use unpooled connection for schema initialization/migrations if available, otherwise DATABASE_URL
const connString = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;

// Create a connection pool for initialization
const pool = new Pool({
  connectionString: connString,
  ssl: isNeonOrSsl ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

// Helper function to execute queries
export const query = async (text: string, params?: any[]): Promise<any> => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log('Executed query', { text: text.trim().split('\n')[0], duration, rows: res.rowCount });
    return res;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
};

// Close the pool when the application shuts down
export const closePool = async () => {
  await pool.end();
};

export default pool;

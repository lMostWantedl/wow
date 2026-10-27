import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const resetDatabase = async () => {
  // Connect to postgres database to drop and recreate the target database
  const adminPool = new Pool({
    connectionString: process.env.DATABASE_URL?.replace(/\/[^\/]+$/, '/postgres'),
  });

  const dbName = process.env.DATABASE_URL?.split('/').pop()?.split('?')[0];

  if (!dbName) {
    throw new Error('Database name not found in DATABASE_URL');
  }

  try {
    console.log(`Dropping database: ${dbName}`);
    
    // Terminate existing connections to the database
    await adminPool.query(`
      SELECT pg_terminate_backend(pid)
      FROM pg_stat_activity
      WHERE datname = $1 AND pid <> pg_backend_pid()
    `, [dbName]);

    // Drop the database
    await adminPool.query(`DROP DATABASE IF EXISTS "${dbName}"`);
    
    console.log(`Creating database: ${dbName}`);
    // Create the database
    await adminPool.query(`CREATE DATABASE "${dbName}"`);
    
    console.log('Database reset successful!');
  } catch (error) {
    console.error('Error resetting database:', error);
    throw error;
  } finally {
    await adminPool.end();
  }
};

// Run if called directly
if (require.main === module) {
  resetDatabase()
    .then(() => {
      console.log('Database reset completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Database reset failed:', error);
      process.exit(1);
    });
}

export default resetDatabase;

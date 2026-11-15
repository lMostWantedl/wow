import { query, closePool } from '../src/database/init-connection';

async function run() {
  try {
    await query(`
      ALTER TABLE garage_expenses ADD COLUMN IF NOT EXISTS is_garage_work_expense BOOLEAN DEFAULT false;
    `);
    console.log("Column is_garage_work_expense added successfully or already exists!");
  } catch (err) {
    console.error("Migration error:", err);
  } finally {
    await closePool();
  }
}

run();

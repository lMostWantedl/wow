import { query, closePool } from './init-connection';

const addUnitColumns = async () => {
  try {
    console.log('Adding unit columns to spare_parts table...');
    
    // Add unit column if it doesn't exist
    await query(`
      ALTER TABLE spare_parts 
      ADD COLUMN IF NOT EXISTS unit VARCHAR(20) DEFAULT 'pieces'
    `);
    
    // Add unit_type column if it doesn't exist
    await query(`
      ALTER TABLE spare_parts 
      ADD COLUMN IF NOT EXISTS unit_type VARCHAR(20) DEFAULT 'discrete'
    `);
    
    // Update existing records to have default values
    await query(`
      UPDATE spare_parts 
      SET unit = 'pieces', unit_type = 'discrete' 
      WHERE unit IS NULL OR unit_type IS NULL
    `);
    
    console.log('Unit columns added successfully');
    
  } catch (error) {
    console.error('Failed to add unit columns:', error);
    throw error;
  } finally {
    await closePool();
  }
};

// Run the migration if this file is executed directly
if (require.main === module) {
  addUnitColumns()
    .then(() => {
      console.log('Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

export default addUnitColumns;

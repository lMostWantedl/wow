import { query, closePool } from './init-connection';

const addEcmColumn = async () => {
  try {
    console.log('Adding ECM column to vehicle_variants table...');
    
    // Add ECM column if it doesn't exist
    await query(`
      ALTER TABLE vehicle_variants 
      ADD COLUMN IF NOT EXISTS ecm VARCHAR(100)
    `);
    
    console.log('ECM column added successfully!');
  } catch (error) {
    console.error('Failed to add ECM column:', error);
    throw error;
  }
};

// Run the migration if this file is executed directly
if (require.main === module) {
  addEcmColumn()
    .then(() => {
      console.log('ECM column migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('ECM column migration failed:', error);
      process.exit(1);
    });
}

export { addEcmColumn };


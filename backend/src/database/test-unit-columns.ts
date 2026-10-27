import { query, closePool } from './init-connection';

const testUnitColumns = async () => {
  try {
    console.log('Testing unit columns in spare_parts table...');
    
    // Check if the columns exist
    const result = await query(`
      SELECT column_name, data_type, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'spare_parts' 
      AND column_name IN ('unit', 'unit_type')
      ORDER BY column_name
    `);
    
    console.log('Unit columns found:');
    result.rows.forEach(row => {
      console.log(`- ${row.column_name}: ${row.data_type} (default: ${row.column_default})`);
    });
    
    // Test inserting a spare part with unit information
    const testResult = await query(`
      INSERT INTO spare_parts (name, category, price, cost, unit, unit_type) 
      VALUES ('Test Liquid Item', 'Test', 100, 50, 'liters', 'liquid') 
      RETURNING id, name, unit, unit_type
    `);
    
    console.log('Test insert successful:', testResult.rows[0]);
    
    // Clean up test data
    await query('DELETE FROM spare_parts WHERE name = $1', ['Test Liquid Item']);
    console.log('Test data cleaned up');
    
  } catch (error) {
    console.error('Test failed:', error);
    throw error;
  } finally {
    await closePool();
  }
};

// Run the test if this file is executed directly
if (require.main === module) {
  testUnitColumns()
    .then(() => {
      console.log('Database test completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Database test failed:', error);
      process.exit(1);
    });
}

export default testUnitColumns;

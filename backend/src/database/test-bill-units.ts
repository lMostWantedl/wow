import { query, closePool } from './init-connection';

const testBillUnits = async () => {
  try {
    console.log('Testing bill spare parts units...');
    
    // Get a sample bill with spare parts
    const billResult = await query(`
      SELECT b.id, b.bill_number
      FROM bills b
      WHERE EXISTS (
        SELECT 1 FROM bill_spare_parts bsp WHERE bsp.bill_id = b.id
      )
      LIMIT 1
    `);
    
    if (billResult.rows.length === 0) {
      console.log('No bills with spare parts found');
      return;
    }
    
    const billId = billResult.rows[0].id;
    console.log(`Testing with bill: ${billResult.rows[0].bill_number} (${billId})`);
    
    // Test the updated query
    const result = await query(`
      SELECT bsp.*, sp.name as spare_part_name, sp.part_number, sp.unit
      FROM bill_spare_parts bsp
      JOIN spare_parts sp ON bsp.spare_part_id = sp.id
      WHERE bsp.bill_id = $1
    `, [billId]);
    
    console.log('Bill spare parts with units:');
    result.rows.forEach(row => {
      console.log(`- ${row.spare_part_name}: ${row.quantity} ${row.unit || 'pieces'}`);
    });
    
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    await closePool();
  }
};

// Run the test if this file is executed directly
if (require.main === module) {
  testBillUnits()
    .then(() => {
      console.log('Bill units test completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Bill units test failed:', error);
      process.exit(1);
    });
}

export default testBillUnits;

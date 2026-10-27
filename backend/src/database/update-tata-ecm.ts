import { query, closePool } from './init-connection';

const updateTataEcm = async () => {
  try {
    console.log('Updating Tata variants with ECM information...');

    // Get all Tata variants
    const variantsResult = await query(`
      SELECT vv.id, vv.name, vm.name as model_name
      FROM vehicle_variants vv
      JOIN vehicle_models vm ON vv.model_id = vm.id
      JOIN vehicle_makes vmk ON vm.make_id = vmk.id
      WHERE vmk.name = 'Tata'
    `);

    console.log(`Found ${variantsResult.rows.length} Tata variants to update`);

    // Update ECM based on model and variant
    for (const variant of variantsResult.rows) {
      let ecm = '';
      
      if (variant.model_name === 'Nexon') {
        ecm = 'Bosch MED17.5.22';
      } else if (variant.model_name === 'Harrier' || variant.model_name === 'Safari') {
        ecm = 'Bosch EDC17C64';
      } else if (variant.model_name === 'Tiago' || variant.model_name === 'Tigor' || variant.model_name === 'Altroz') {
        ecm = 'Bosch MED17.5.22';
      }

      if (ecm) {
        await query(
          'UPDATE vehicle_variants SET ecm = $1 WHERE id = $2',
          [ecm, variant.id]
        );
        console.log(`Updated ${variant.model_name} ${variant.name} with ECM: ${ecm}`);
      }
    }

    console.log('Tata ECM update completed successfully!');
  } catch (error) {
    console.error('Failed to update Tata ECM:', error);
    throw error;
  }
};

// Run the update if this file is executed directly
if (require.main === module) {
  updateTataEcm()
    .then(() => {
      console.log('Tata ECM update completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Tata ECM update failed:', error);
      process.exit(1);
    });
}

export { updateTataEcm };


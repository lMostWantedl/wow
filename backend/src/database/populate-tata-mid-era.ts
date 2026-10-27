import { query, closePool } from './init-connection';

const populateTataMidEra = async () => {
  try {
    console.log('Starting Tata mid-era models population (2005-2015)...');

    // Get Tata make ID
    const tataResult = await query('SELECT id FROM vehicle_makes WHERE name = $1', ['Tata']);
    const tataId = tataResult.rows[0].id;

    // Mid-era Tata Models (2005-2015)
    const tataModels = [
      {
        name: 'Indica Vista',
        year_start: 2008,
        year_end: 2015,
        body_type: 'hatchback',
        variants: [
          {
            name: 'Terra',
            variant_code: 'Terra',
            engine_type: 'diesel',
            engine_capacity: '1.3L Quadrajet',
            transmission: 'manual',
            fuel_type: 'diesel',
            power_bhp: 75,
            torque_nm: 190,
            seating_capacity: 5,
            fuel_tank_capacity: 37,
            ground_clearance: 165,
            boot_space: 232,
            ecm: 'Bosch EDC17C64',
            colors: [
              { name: 'Pearl White', color_code: '#FFFFFF', color_type: 'pearl' },
              { name: 'Silver', color_code: '#C0C0C0', color_type: 'metallic' },
              { name: 'Red', color_code: '#FF0000', color_type: 'solid' },
              { name: 'Blue', color_code: '#0000FF', color_type: 'solid' }
            ]
          },
          {
            name: 'Aura',
            variant_code: 'Aura',
            engine_type: 'petrol',
            engine_capacity: '1.2L Revotron',
            transmission: 'manual',
            fuel_type: 'petrol',
            power_bhp: 85,
            torque_nm: 114,
            seating_capacity: 5,
            fuel_tank_capacity: 37,
            ground_clearance: 165,
            boot_space: 232,
            ecm: 'Bosch MED17.5.22',
            colors: [
              { name: 'Pearl White', color_code: '#FFFFFF', color_type: 'pearl' },
              { name: 'Silver', color_code: '#C0C0C0', color_type: 'metallic' },
              { name: 'Red', color_code: '#FF0000', color_type: 'solid' },
              { name: 'Blue', color_code: '#0000FF', color_type: 'solid' }
            ]
          }
        ]
      },
      {
        name: 'Indigo Manza',
        year_start: 2009,
        year_end: 2016,
        body_type: 'sedan',
        variants: [
          {
            name: 'Aqua',
            variant_code: 'Aqua',
            engine_type: 'diesel',
            engine_capacity: '1.3L Quadrajet',
            transmission: 'manual',
            fuel_type: 'diesel',
            power_bhp: 90,
            torque_nm: 200,
            seating_capacity: 5,
            fuel_tank_capacity: 44,
            ground_clearance: 170,
            boot_space: 460,
            ecm: 'Bosch EDC17C64',
            colors: [
              { name: 'Pearl White', color_code: '#FFFFFF', color_type: 'pearl' },
              { name: 'Silver', color_code: '#C0C0C0', color_type: 'metallic' },
              { name: 'Red', color_code: '#FF0000', color_type: 'solid' },
              { name: 'Blue', color_code: '#0000FF', color_type: 'solid' }
            ]
          },
          {
            name: 'Aura',
            variant_code: 'Aura',
            engine_type: 'petrol',
            engine_capacity: '1.4L Revotron',
            transmission: 'manual',
            fuel_type: 'petrol',
            power_bhp: 90,
            torque_nm: 140,
            seating_capacity: 5,
            fuel_tank_capacity: 44,
            ground_clearance: 170,
            boot_space: 460,
            ecm: 'Bosch MED17.5.22',
            colors: [
              { name: 'Pearl White', color_code: '#FFFFFF', color_type: 'pearl' },
              { name: 'Silver', color_code: '#C0C0C0', color_type: 'metallic' },
              { name: 'Red', color_code: '#FF0000', color_type: 'solid' },
              { name: 'Blue', color_code: '#0000FF', color_type: 'solid' }
            ]
          }
        ]
      },
      {
        name: 'Sumo Grande',
        year_start: 2008,
        year_end: 2014,
        body_type: 'suv',
        variants: [
          {
            name: 'EX',
            variant_code: 'EX',
            engine_type: 'diesel',
            engine_capacity: '2.2L DICOR',
            transmission: 'manual',
            fuel_type: 'diesel',
            power_bhp: 120,
            torque_nm: 250,
            seating_capacity: 7,
            fuel_tank_capacity: 60,
            ground_clearance: 200,
            boot_space: 300,
            ecm: 'Bosch EDC17C64',
            colors: [
              { name: 'Pearl White', color_code: '#FFFFFF', color_type: 'pearl' },
              { name: 'Silver', color_code: '#C0C0C0', color_type: 'metallic' },
              { name: 'Black', color_code: '#000000', color_type: 'solid' }
            ]
          },
          {
            name: 'LX',
            variant_code: 'LX',
            engine_type: 'diesel',
            engine_capacity: '2.2L DICOR',
            transmission: 'manual',
            fuel_type: 'diesel',
            power_bhp: 120,
            torque_nm: 250,
            seating_capacity: 7,
            fuel_tank_capacity: 60,
            ground_clearance: 200,
            boot_space: 300,
            ecm: 'Bosch EDC17C64',
            colors: [
              { name: 'Pearl White', color_code: '#FFFFFF', color_type: 'pearl' },
              { name: 'Silver', color_code: '#C0C0C0', color_type: 'metallic' },
              { name: 'Black', color_code: '#000000', color_type: 'solid' }
            ]
          }
        ]
      },
      {
        name: 'Aria',
        year_start: 2010,
        year_end: 2017,
        body_type: 'suv',
        variants: [
          {
            name: 'Pleasure',
            variant_code: 'Pleasure',
            engine_type: 'diesel',
            engine_capacity: '2.2L DICOR',
            transmission: 'manual',
            fuel_type: 'diesel',
            power_bhp: 140,
            torque_nm: 320,
            seating_capacity: 7,
            fuel_tank_capacity: 60,
            ground_clearance: 200,
            boot_space: 300,
            ecm: 'Bosch EDC17C64',
            colors: [
              { name: 'Pearl White', color_code: '#FFFFFF', color_type: 'pearl' },
              { name: 'Silver', color_code: '#C0C0C0', color_type: 'metallic' },
              { name: 'Black', color_code: '#000000', color_type: 'solid' }
            ]
          },
          {
            name: 'Pride',
            variant_code: 'Pride',
            engine_type: 'diesel',
            engine_capacity: '2.2L DICOR',
            transmission: 'manual',
            fuel_type: 'diesel',
            power_bhp: 140,
            torque_nm: 320,
            seating_capacity: 7,
            fuel_tank_capacity: 60,
            ground_clearance: 200,
            boot_space: 300,
            ecm: 'Bosch EDC17C64',
            colors: [
              { name: 'Pearl White', color_code: '#FFFFFF', color_type: 'pearl' },
              { name: 'Silver', color_code: '#C0C0C0', color_type: 'metallic' },
              { name: 'Black', color_code: '#000000', color_type: 'solid' }
            ]
          }
        ]
      }
    ];

    // Insert models and variants
    for (const model of tataModels) {
      console.log(`Inserting ${model.name} model...`);
      
      // Check if model already exists
      const existingModel = await query('SELECT id FROM vehicle_models WHERE make_id = $1 AND name = $2', [tataId, model.name]);
      if (existingModel.rows.length > 0) {
        console.log(`  ${model.name} already exists, skipping...`);
        continue;
      }
      
      // Insert model
      const modelResult = await query(
        'INSERT INTO vehicle_models (make_id, name, year_start, year_end, body_type) VALUES ($1, $2, $3, $4, $5) RETURNING id',
        [tataId, model.name, model.year_start, model.year_end, model.body_type]
      );
      const modelId = modelResult.rows[0].id;

      // Insert variants
      for (const variant of model.variants) {
        console.log(`  Inserting ${variant.name} variant...`);
        
        const variantResult = await query(
          'INSERT INTO vehicle_variants (model_id, name, variant_code, engine_type, engine_capacity, transmission, fuel_type, power_bhp, torque_nm, seating_capacity, fuel_tank_capacity, ground_clearance, boot_space, ecm) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING id',
          [modelId, variant.name, variant.variant_code, variant.engine_type, variant.engine_capacity, variant.transmission, variant.fuel_type, variant.power_bhp, variant.torque_nm, variant.seating_capacity, variant.fuel_tank_capacity, variant.ground_clearance, variant.boot_space, variant.ecm]
        );
        const variantId = variantResult.rows[0].id;

        // Insert colors
        for (const color of variant.colors) {
          await query(
            'INSERT INTO vehicle_colors (variant_id, name, color_code, color_type) VALUES ($1, $2, $3, $4)',
            [variantId, color.name, color.color_code, color.color_type]
          );
        }
      }
    }

    console.log('Tata mid-era models population completed successfully!');
  } catch (error) {
    console.error('Failed to populate Tata mid-era models:', error);
    throw error;
  }
};

// Run the population if this file is executed directly
if (require.main === module) {
  populateTataMidEra()
    .then(() => {
      console.log('Tata mid-era models population completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Tata mid-era models population failed:', error);
      process.exit(1);
    });
}

export { populateTataMidEra };


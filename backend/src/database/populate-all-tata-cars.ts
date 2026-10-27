import { query, closePool } from './init-connection';

const populateAllTataCars = async () => {
  try {
    console.log('Starting comprehensive Tata cars population (2000-2024)...');

    // Get Tata make ID
    const tataResult = await query('SELECT id FROM vehicle_makes WHERE name = $1', ['Tata']);
    if (tataResult.rows.length === 0) {
      console.log('Tata make not found, creating...');
      await query('INSERT INTO vehicle_makes (name, country) VALUES ($1, $2)', ['Tata', 'India']);
      const newTataResult = await query('SELECT id FROM vehicle_makes WHERE name = $1', ['Tata']);
      var tataId = newTataResult.rows[0].id;
    } else {
      var tataId = tataResult.rows[0].id;
    }

    // Comprehensive Tata Models from 2000-2024
    const tataModels = [
      // Early 2000s Models
      {
        name: 'Indica',
        year_start: 1998,
        year_end: 2018,
        body_type: 'hatchback',
        variants: [
          {
            name: 'DLS',
            variant_code: 'DLS',
            engine_type: 'diesel',
            engine_capacity: '1.4L TDI',
            transmission: 'manual',
            fuel_type: 'diesel',
            power_bhp: 70,
            torque_nm: 135,
            seating_capacity: 5,
            fuel_tank_capacity: 37,
            ground_clearance: 165,
            boot_space: 200,
            ecm: 'Bosch EDC15C2',
            colors: [
              { name: 'Pearl White', color_code: '#FFFFFF', color_type: 'pearl' },
              { name: 'Silver', color_code: '#C0C0C0', color_type: 'metallic' },
              { name: 'Red', color_code: '#FF0000', color_type: 'solid' },
              { name: 'Blue', color_code: '#0000FF', color_type: 'solid' }
            ]
          },
          {
            name: 'DLG',
            variant_code: 'DLG',
            engine_type: 'petrol',
            engine_capacity: '1.4L MPFI',
            transmission: 'manual',
            fuel_type: 'petrol',
            power_bhp: 85,
            torque_nm: 110,
            seating_capacity: 5,
            fuel_tank_capacity: 37,
            ground_clearance: 165,
            boot_space: 200,
            ecm: 'Bosch ME7.5.10',
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
        name: 'Indigo',
        year_start: 2002,
        year_end: 2016,
        body_type: 'sedan',
        variants: [
          {
            name: 'DLS',
            variant_code: 'DLS',
            engine_type: 'diesel',
            engine_capacity: '1.4L TDI',
            transmission: 'manual',
            fuel_type: 'diesel',
            power_bhp: 70,
            torque_nm: 135,
            seating_capacity: 5,
            fuel_tank_capacity: 37,
            ground_clearance: 165,
            boot_space: 400,
            ecm: 'Bosch EDC15C2',
            colors: [
              { name: 'Pearl White', color_code: '#FFFFFF', color_type: 'pearl' },
              { name: 'Silver', color_code: '#C0C0C0', color_type: 'metallic' },
              { name: 'Red', color_code: '#FF0000', color_type: 'solid' },
              { name: 'Blue', color_code: '#0000FF', color_type: 'solid' }
            ]
          },
          {
            name: 'DLG',
            variant_code: 'DLG',
            engine_type: 'petrol',
            engine_capacity: '1.4L MPFI',
            transmission: 'manual',
            fuel_type: 'petrol',
            power_bhp: 85,
            torque_nm: 110,
            seating_capacity: 5,
            fuel_tank_capacity: 37,
            ground_clearance: 165,
            boot_space: 400,
            ecm: 'Bosch ME7.5.10',
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
        name: 'Safari',
        year_start: 1998,
        year_end: 2019,
        body_type: 'suv',
        variants: [
          {
            name: 'EX',
            variant_code: 'EX',
            engine_type: 'diesel',
            engine_capacity: '3.0L DI',
            transmission: 'manual',
            fuel_type: 'diesel',
            power_bhp: 115,
            torque_nm: 250,
            seating_capacity: 7,
            fuel_tank_capacity: 60,
            ground_clearance: 200,
            boot_space: 300,
            ecm: 'Bosch EDC15C2',
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
            engine_capacity: '3.0L DI',
            transmission: 'manual',
            fuel_type: 'diesel',
            power_bhp: 115,
            torque_nm: 250,
            seating_capacity: 7,
            fuel_tank_capacity: 60,
            ground_clearance: 200,
            boot_space: 300,
            ecm: 'Bosch EDC15C2',
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

    console.log('Early Tata models population completed successfully!');
  } catch (error) {
    console.error('Failed to populate early Tata models:', error);
    throw error;
  }
};

// Run the population if this file is executed directly
if (require.main === module) {
  populateAllTataCars()
    .then(() => {
      console.log('Early Tata models population completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Early Tata models population failed:', error);
      process.exit(1);
    });
}

export { populateAllTataCars };


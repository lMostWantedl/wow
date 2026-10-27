import { query, closePool } from './init-connection';

const populateTataCars = async () => {
  try {
    console.log('Starting Tata cars population...');

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

    // Tata Models with detailed specifications
    const tataModels = [
      {
        name: 'Nexon',
        year_start: 2017,
        year_end: 2024,
        body_type: 'suv',
        variants: [
          {
            name: 'XE',
            variant_code: 'XE',
            engine_type: 'petrol',
            engine_capacity: '1.2L Turbo',
            transmission: 'manual',
            fuel_type: 'petrol',
            power_bhp: 120,
            torque_nm: 170,
            seating_capacity: 5,
            fuel_tank_capacity: 44,
            ground_clearance: 209,
            boot_space: 350,
            ecm: 'Bosch MED17.5.22',
            colors: [
              { name: 'Calgary White', color_code: '#FFFFFF', color_type: 'solid' },
              { name: 'Seattle Silver', color_code: '#C0C0C0', color_type: 'metallic' },
              { name: 'Arizona Blue', color_code: '#0066CC', color_type: 'metallic' },
              { name: 'Manhattan Orange', color_code: '#FF6600', color_type: 'metallic' }
            ]
          },
          {
            name: 'XM',
            variant_code: 'XM',
            engine_type: 'petrol',
            engine_capacity: '1.2L Turbo',
            transmission: 'manual',
            fuel_type: 'petrol',
            power_bhp: 120,
            torque_nm: 170,
            seating_capacity: 5,
            fuel_tank_capacity: 44,
            ground_clearance: 209,
            boot_space: 350,
            ecm: 'Bosch MED17.5.22',
            colors: [
              { name: 'Calgary White', color_code: '#FFFFFF', color_type: 'solid' },
              { name: 'Seattle Silver', color_code: '#C0C0C0', color_type: 'metallic' },
              { name: 'Arizona Blue', color_code: '#0066CC', color_type: 'metallic' },
              { name: 'Manhattan Orange', color_code: '#FF6600', color_type: 'metallic' },
              { name: 'Seattle Silver Dual Tone', color_code: '#C0C0C0', color_type: 'metallic' }
            ]
          },
          {
            name: 'XZ+',
            variant_code: 'XZ+',
            engine_type: 'petrol',
            engine_capacity: '1.2L Turbo',
            transmission: 'manual',
            fuel_type: 'petrol',
            power_bhp: 120,
            torque_nm: 170,
            seating_capacity: 5,
            fuel_tank_capacity: 44,
            ground_clearance: 209,
            boot_space: 350,
            ecm: 'Bosch MED17.5.22',
            colors: [
              { name: 'Calgary White', color_code: '#FFFFFF', color_type: 'solid' },
              { name: 'Seattle Silver', color_code: '#C0C0C0', color_type: 'metallic' },
              { name: 'Arizona Blue', color_code: '#0066CC', color_type: 'metallic' },
              { name: 'Manhattan Orange', color_code: '#FF6600', color_type: 'metallic' },
              { name: 'Seattle Silver Dual Tone', color_code: '#C0C0C0', color_type: 'metallic' },
              { name: 'Arizona Blue Dual Tone', color_code: '#0066CC', color_type: 'metallic' }
            ]
          },
          {
            name: 'XZ+ XM',
            variant_code: 'XZ+_XM',
            engine_type: 'petrol',
            engine_capacity: '1.2L Turbo',
            transmission: 'manual',
            fuel_type: 'petrol',
            power_bhp: 120,
            torque_nm: 170,
            seating_capacity: 5,
            fuel_tank_capacity: 44,
            ground_clearance: 209,
            boot_space: 350,
            ecm: 'Bosch MED17.5.22',
            colors: [
              { name: 'Calgary White', color_code: '#FFFFFF', color_type: 'solid' },
              { name: 'Seattle Silver', color_code: '#C0C0C0', color_type: 'metallic' },
              { name: 'Arizona Blue', color_code: '#0066CC', color_type: 'metallic' },
              { name: 'Manhattan Orange', color_code: '#FF6600', color_type: 'metallic' },
              { name: 'Seattle Silver Dual Tone', color_code: '#C0C0C0', color_type: 'metallic' },
              { name: 'Arizona Blue Dual Tone', color_code: '#0066CC', color_type: 'metallic' }
            ]
          },
          {
            name: 'XZ+ XM S',
            variant_code: 'XZ+_XM_S',
            engine_type: 'petrol',
            engine_capacity: '1.2L Turbo',
            transmission: 'manual',
            fuel_type: 'petrol',
            power_bhp: 120,
            torque_nm: 170,
            seating_capacity: 5,
            fuel_tank_capacity: 44,
            ground_clearance: 209,
            boot_space: 350,
            ecm: 'Bosch MED17.5.22',
            colors: [
              { name: 'Calgary White', color_code: '#FFFFFF', color_type: 'solid' },
              { name: 'Seattle Silver', color_code: '#C0C0C0', color_type: 'metallic' },
              { name: 'Arizona Blue', color_code: '#0066CC', color_type: 'metallic' },
              { name: 'Manhattan Orange', color_code: '#FF6600', color_type: 'metallic' },
              { name: 'Seattle Silver Dual Tone', color_code: '#C0C0C0', color_type: 'metallic' },
              { name: 'Arizona Blue Dual Tone', color_code: '#0066CC', color_type: 'metallic' }
            ]
          },
          {
            name: 'XZ+ XM S AMT',
            variant_code: 'XZ+_XM_S_AMT',
            engine_type: 'petrol',
            engine_capacity: '1.2L Turbo',
            transmission: 'automatic',
            fuel_type: 'petrol',
            power_bhp: 120,
            torque_nm: 170,
            seating_capacity: 5,
            fuel_tank_capacity: 44,
            ground_clearance: 209,
            boot_space: 350,
            ecm: 'Bosch MED17.5.22',
            colors: [
              { name: 'Calgary White', color_code: '#FFFFFF', color_type: 'solid' },
              { name: 'Seattle Silver', color_code: '#C0C0C0', color_type: 'metallic' },
              { name: 'Arizona Blue', color_code: '#0066CC', color_type: 'metallic' },
              { name: 'Manhattan Orange', color_code: '#FF6600', color_type: 'metallic' },
              { name: 'Seattle Silver Dual Tone', color_code: '#C0C0C0', color_type: 'metallic' },
              { name: 'Arizona Blue Dual Tone', color_code: '#0066CC', color_type: 'metallic' }
            ]
          },
          {
            name: 'XZ+ XM S DCT',
            variant_code: 'XZ+_XM_S_DCT',
            engine_type: 'petrol',
            engine_capacity: '1.2L Turbo',
            transmission: 'dct',
            fuel_type: 'petrol',
            power_bhp: 120,
            torque_nm: 170,
            seating_capacity: 5,
            fuel_tank_capacity: 44,
            ground_clearance: 209,
            boot_space: 350,
            ecm: 'Bosch MED17.5.22',
            colors: [
              { name: 'Calgary White', color_code: '#FFFFFF', color_type: 'solid' },
              { name: 'Seattle Silver', color_code: '#C0C0C0', color_type: 'metallic' },
              { name: 'Arizona Blue', color_code: '#0066CC', color_type: 'metallic' },
              { name: 'Manhattan Orange', color_code: '#FF6600', color_type: 'metallic' },
              { name: 'Seattle Silver Dual Tone', color_code: '#C0C0C0', color_type: 'metallic' },
              { name: 'Arizona Blue Dual Tone', color_code: '#0066CC', color_type: 'metallic' }
            ]
          }
        ]
      },
      {
        name: 'Harrier',
        year_start: 2019,
        year_end: 2024,
        body_type: 'suv',
        variants: [
          {
            name: 'XE',
            variant_code: 'XE',
            engine_type: 'diesel',
            engine_capacity: '2.0L Kryotec',
            transmission: 'manual',
            fuel_type: 'diesel',
            power_bhp: 170,
            torque_nm: 350,
            seating_capacity: 5,
            fuel_tank_capacity: 50,
            ground_clearance: 205,
            boot_space: 425,
            ecm: 'Bosch EDC17C64',
            colors: [
              { name: 'Calgary White', color_code: '#FFFFFF', color_type: 'solid' },
              { name: 'Seattle Silver', color_code: '#C0C0C0', color_type: 'metallic' },
              { name: 'Arizona Blue', color_code: '#0066CC', color_type: 'metallic' },
              { name: 'Manhattan Orange', color_code: '#FF6600', color_type: 'metallic' }
            ]
          },
          {
            name: 'XM',
            variant_code: 'XM',
            engine_type: 'diesel',
            engine_capacity: '2.0L Kryotec',
            transmission: 'manual',
            fuel_type: 'diesel',
            power_bhp: 170,
            torque_nm: 350,
            seating_capacity: 5,
            fuel_tank_capacity: 50,
            ground_clearance: 205,
            boot_space: 425,
            ecm: 'Bosch EDC17C64',
            colors: [
              { name: 'Calgary White', color_code: '#FFFFFF', color_type: 'solid' },
              { name: 'Seattle Silver', color_code: '#C0C0C0', color_type: 'metallic' },
              { name: 'Arizona Blue', color_code: '#0066CC', color_type: 'metallic' },
              { name: 'Manhattan Orange', color_code: '#FF6600', color_type: 'metallic' },
              { name: 'Seattle Silver Dual Tone', color_code: '#C0C0C0', color_type: 'metallic' }
            ]
          },
          {
            name: 'XZ',
            variant_code: 'XZ',
            engine_type: 'diesel',
            engine_capacity: '2.0L Kryotec',
            transmission: 'manual',
            fuel_type: 'diesel',
            power_bhp: 170,
            torque_nm: 350,
            seating_capacity: 5,
            fuel_tank_capacity: 50,
            ground_clearance: 205,
            boot_space: 425,
            ecm: 'Bosch EDC17C64',
            colors: [
              { name: 'Calgary White', color_code: '#FFFFFF', color_type: 'solid' },
              { name: 'Seattle Silver', color_code: '#C0C0C0', color_type: 'metallic' },
              { name: 'Arizona Blue', color_code: '#0066CC', color_type: 'metallic' },
              { name: 'Manhattan Orange', color_code: '#FF6600', color_type: 'metallic' },
              { name: 'Seattle Silver Dual Tone', color_code: '#C0C0C0', color_type: 'metallic' },
              { name: 'Arizona Blue Dual Tone', color_code: '#0066CC', color_type: 'metallic' }
            ]
          },
          {
            name: 'XZ+',
            variant_code: 'XZ+',
            engine_type: 'diesel',
            engine_capacity: '2.0L Kryotec',
            transmission: 'manual',
            fuel_type: 'diesel',
            power_bhp: 170,
            torque_nm: 350,
            seating_capacity: 5,
            fuel_tank_capacity: 50,
            ground_clearance: 205,
            boot_space: 425,
            ecm: 'Bosch EDC17C64',
            colors: [
              { name: 'Calgary White', color_code: '#FFFFFF', color_type: 'solid' },
              { name: 'Seattle Silver', color_code: '#C0C0C0', color_type: 'metallic' },
              { name: 'Arizona Blue', color_code: '#0066CC', color_type: 'metallic' },
              { name: 'Manhattan Orange', color_code: '#FF6600', color_type: 'metallic' },
              { name: 'Seattle Silver Dual Tone', color_code: '#C0C0C0', color_type: 'metallic' },
              { name: 'Arizona Blue Dual Tone', color_code: '#0066CC', color_type: 'metallic' }
            ]
          },
          {
            name: 'XZ+ AT',
            variant_code: 'XZ+_AT',
            engine_type: 'diesel',
            engine_capacity: '2.0L Kryotec',
            transmission: 'automatic',
            fuel_type: 'diesel',
            power_bhp: 170,
            torque_nm: 350,
            seating_capacity: 5,
            fuel_tank_capacity: 50,
            ground_clearance: 205,
            boot_space: 425,
            ecm: 'Bosch EDC17C64',
            colors: [
              { name: 'Calgary White', color_code: '#FFFFFF', color_type: 'solid' },
              { name: 'Seattle Silver', color_code: '#C0C0C0', color_type: 'metallic' },
              { name: 'Arizona Blue', color_code: '#0066CC', color_type: 'metallic' },
              { name: 'Manhattan Orange', color_code: '#FF6600', color_type: 'metallic' },
              { name: 'Seattle Silver Dual Tone', color_code: '#C0C0C0', color_type: 'metallic' },
              { name: 'Arizona Blue Dual Tone', color_code: '#0066CC', color_type: 'metallic' }
            ]
          }
        ]
      },
      {
        name: 'Safari',
        year_start: 2021,
        year_end: 2024,
        body_type: 'suv',
        variants: [
          {
            name: 'XE',
            variant_code: 'XE',
            engine_type: 'diesel',
            engine_capacity: '2.0L Kryotec',
            transmission: 'manual',
            fuel_type: 'diesel',
            power_bhp: 170,
            torque_nm: 350,
            seating_capacity: 7,
            fuel_tank_capacity: 50,
            ground_clearance: 205,
            boot_space: 447,
            ecm: 'Bosch EDC17C64',
            colors: [
              { name: 'Calgary White', color_code: '#FFFFFF', color_type: 'solid' },
              { name: 'Seattle Silver', color_code: '#C0C0C0', color_type: 'metallic' },
              { name: 'Arizona Blue', color_code: '#0066CC', color_type: 'metallic' },
              { name: 'Manhattan Orange', color_code: '#FF6600', color_type: 'metallic' }
            ]
          },
          {
            name: 'XM',
            variant_code: 'XM',
            engine_type: 'diesel',
            engine_capacity: '2.0L Kryotec',
            transmission: 'manual',
            fuel_type: 'diesel',
            power_bhp: 170,
            torque_nm: 350,
            seating_capacity: 7,
            fuel_tank_capacity: 50,
            ground_clearance: 205,
            boot_space: 447,
            ecm: 'Bosch EDC17C64',
            colors: [
              { name: 'Calgary White', color_code: '#FFFFFF', color_type: 'solid' },
              { name: 'Seattle Silver', color_code: '#C0C0C0', color_type: 'metallic' },
              { name: 'Arizona Blue', color_code: '#0066CC', color_type: 'metallic' },
              { name: 'Manhattan Orange', color_code: '#FF6600', color_type: 'metallic' },
              { name: 'Seattle Silver Dual Tone', color_code: '#C0C0C0', color_type: 'metallic' }
            ]
          },
          {
            name: 'XZ',
            variant_code: 'XZ',
            engine_type: 'diesel',
            engine_capacity: '2.0L Kryotec',
            transmission: 'manual',
            fuel_type: 'diesel',
            power_bhp: 170,
            torque_nm: 350,
            seating_capacity: 7,
            fuel_tank_capacity: 50,
            ground_clearance: 205,
            boot_space: 447,
            ecm: 'Bosch EDC17C64',
            colors: [
              { name: 'Calgary White', color_code: '#FFFFFF', color_type: 'solid' },
              { name: 'Seattle Silver', color_code: '#C0C0C0', color_type: 'metallic' },
              { name: 'Arizona Blue', color_code: '#0066CC', color_type: 'metallic' },
              { name: 'Manhattan Orange', color_code: '#FF6600', color_type: 'metallic' },
              { name: 'Seattle Silver Dual Tone', color_code: '#C0C0C0', color_type: 'metallic' },
              { name: 'Arizona Blue Dual Tone', color_code: '#0066CC', color_type: 'metallic' }
            ]
          },
          {
            name: 'XZ+',
            variant_code: 'XZ+',
            engine_type: 'diesel',
            engine_capacity: '2.0L Kryotec',
            transmission: 'manual',
            fuel_type: 'diesel',
            power_bhp: 170,
            torque_nm: 350,
            seating_capacity: 7,
            fuel_tank_capacity: 50,
            ground_clearance: 205,
            boot_space: 447,
            ecm: 'Bosch EDC17C64',
            colors: [
              { name: 'Calgary White', color_code: '#FFFFFF', color_type: 'solid' },
              { name: 'Seattle Silver', color_code: '#C0C0C0', color_type: 'metallic' },
              { name: 'Arizona Blue', color_code: '#0066CC', color_type: 'metallic' },
              { name: 'Manhattan Orange', color_code: '#FF6600', color_type: 'metallic' },
              { name: 'Seattle Silver Dual Tone', color_code: '#C0C0C0', color_type: 'metallic' },
              { name: 'Arizona Blue Dual Tone', color_code: '#0066CC', color_type: 'metallic' }
            ]
          },
          {
            name: 'XZ+ AT',
            variant_code: 'XZ+_AT',
            engine_type: 'diesel',
            engine_capacity: '2.0L Kryotec',
            transmission: 'automatic',
            fuel_type: 'diesel',
            power_bhp: 170,
            torque_nm: 350,
            seating_capacity: 7,
            fuel_tank_capacity: 50,
            ground_clearance: 205,
            boot_space: 447,
            ecm: 'Bosch EDC17C64',
            colors: [
              { name: 'Calgary White', color_code: '#FFFFFF', color_type: 'solid' },
              { name: 'Seattle Silver', color_code: '#C0C0C0', color_type: 'metallic' },
              { name: 'Arizona Blue', color_code: '#0066CC', color_type: 'metallic' },
              { name: 'Manhattan Orange', color_code: '#FF6600', color_type: 'metallic' },
              { name: 'Seattle Silver Dual Tone', color_code: '#C0C0C0', color_type: 'metallic' },
              { name: 'Arizona Blue Dual Tone', color_code: '#0066CC', color_type: 'metallic' }
            ]
          }
        ]
      },
      {
        name: 'Tiago',
        year_start: 2016,
        year_end: 2024,
        body_type: 'hatchback',
        variants: [
          {
            name: 'XE',
            variant_code: 'XE',
            engine_type: 'petrol',
            engine_capacity: '1.2L Revotron',
            transmission: 'manual',
            fuel_type: 'petrol',
            power_bhp: 85,
            torque_nm: 114,
            seating_capacity: 5,
            fuel_tank_capacity: 35,
            ground_clearance: 170,
            boot_space: 242,
            ecm: 'Bosch MED17.5.22',
            colors: [
              { name: 'Calgary White', color_code: '#FFFFFF', color_type: 'solid' },
              { name: 'Seattle Silver', color_code: '#C0C0C0', color_type: 'metallic' },
              { name: 'Arizona Blue', color_code: '#0066CC', color_type: 'metallic' },
              { name: 'Manhattan Orange', color_code: '#FF6600', color_type: 'metallic' }
            ]
          },
          {
            name: 'XM',
            variant_code: 'XM',
            engine_type: 'petrol',
            engine_capacity: '1.2L Revotron',
            transmission: 'manual',
            fuel_type: 'petrol',
            power_bhp: 85,
            torque_nm: 114,
            seating_capacity: 5,
            fuel_tank_capacity: 35,
            ground_clearance: 170,
            boot_space: 242,
            ecm: 'Bosch MED17.5.22',
            colors: [
              { name: 'Calgary White', color_code: '#FFFFFF', color_type: 'solid' },
              { name: 'Seattle Silver', color_code: '#C0C0C0', color_type: 'metallic' },
              { name: 'Arizona Blue', color_code: '#0066CC', color_type: 'metallic' },
              { name: 'Manhattan Orange', color_code: '#FF6600', color_type: 'metallic' },
              { name: 'Seattle Silver Dual Tone', color_code: '#C0C0C0', color_type: 'metallic' }
            ]
          },
          {
            name: 'XZ',
            variant_code: 'XZ',
            engine_type: 'petrol',
            engine_capacity: '1.2L Revotron',
            transmission: 'manual',
            fuel_type: 'petrol',
            power_bhp: 85,
            torque_nm: 114,
            seating_capacity: 5,
            fuel_tank_capacity: 35,
            ground_clearance: 170,
            boot_space: 242,
            ecm: 'Bosch MED17.5.22',
            colors: [
              { name: 'Calgary White', color_code: '#FFFFFF', color_type: 'solid' },
              { name: 'Seattle Silver', color_code: '#C0C0C0', color_type: 'metallic' },
              { name: 'Arizona Blue', color_code: '#0066CC', color_type: 'metallic' },
              { name: 'Manhattan Orange', color_code: '#FF6600', color_type: 'metallic' },
              { name: 'Seattle Silver Dual Tone', color_code: '#C0C0C0', color_type: 'metallic' },
              { name: 'Arizona Blue Dual Tone', color_code: '#0066CC', color_type: 'metallic' }
            ]
          },
          {
            name: 'XZ+',
            variant_code: 'XZ+',
            engine_type: 'petrol',
            engine_capacity: '1.2L Revotron',
            transmission: 'manual',
            fuel_type: 'petrol',
            power_bhp: 85,
            torque_nm: 114,
            seating_capacity: 5,
            fuel_tank_capacity: 35,
            ground_clearance: 170,
            boot_space: 242,
            ecm: 'Bosch MED17.5.22',
            colors: [
              { name: 'Calgary White', color_code: '#FFFFFF', color_type: 'solid' },
              { name: 'Seattle Silver', color_code: '#C0C0C0', color_type: 'metallic' },
              { name: 'Arizona Blue', color_code: '#0066CC', color_type: 'metallic' },
              { name: 'Manhattan Orange', color_code: '#FF6600', color_type: 'metallic' },
              { name: 'Seattle Silver Dual Tone', color_code: '#C0C0C0', color_type: 'metallic' },
              { name: 'Arizona Blue Dual Tone', color_code: '#0066CC', color_type: 'metallic' }
            ]
          },
          {
            name: 'XZ+ AMT',
            variant_code: 'XZ+_AMT',
            engine_type: 'petrol',
            engine_capacity: '1.2L Revotron',
            transmission: 'automatic',
            fuel_type: 'petrol',
            power_bhp: 85,
            torque_nm: 114,
            seating_capacity: 5,
            fuel_tank_capacity: 35,
            ground_clearance: 170,
            boot_space: 242,
            ecm: 'Bosch MED17.5.22',
            colors: [
              { name: 'Calgary White', color_code: '#FFFFFF', color_type: 'solid' },
              { name: 'Seattle Silver', color_code: '#C0C0C0', color_type: 'metallic' },
              { name: 'Arizona Blue', color_code: '#0066CC', color_type: 'metallic' },
              { name: 'Manhattan Orange', color_code: '#FF6600', color_type: 'metallic' },
              { name: 'Seattle Silver Dual Tone', color_code: '#C0C0C0', color_type: 'metallic' },
              { name: 'Arizona Blue Dual Tone', color_code: '#0066CC', color_type: 'metallic' }
            ]
          }
        ]
      },
      {
        name: 'Tigor',
        year_start: 2017,
        year_end: 2024,
        body_type: 'sedan',
        variants: [
          {
            name: 'XE',
            variant_code: 'XE',
            engine_type: 'petrol',
            engine_capacity: '1.2L Revotron',
            transmission: 'manual',
            fuel_type: 'petrol',
            power_bhp: 85,
            torque_nm: 114,
            seating_capacity: 5,
            fuel_tank_capacity: 35,
            ground_clearance: 170,
            boot_space: 419,
            ecm: 'Bosch MED17.5.22',
            colors: [
              { name: 'Calgary White', color_code: '#FFFFFF', color_type: 'solid' },
              { name: 'Seattle Silver', color_code: '#C0C0C0', color_type: 'metallic' },
              { name: 'Arizona Blue', color_code: '#0066CC', color_type: 'metallic' },
              { name: 'Manhattan Orange', color_code: '#FF6600', color_type: 'metallic' }
            ]
          },
          {
            name: 'XM',
            variant_code: 'XM',
            engine_type: 'petrol',
            engine_capacity: '1.2L Revotron',
            transmission: 'manual',
            fuel_type: 'petrol',
            power_bhp: 85,
            torque_nm: 114,
            seating_capacity: 5,
            fuel_tank_capacity: 35,
            ground_clearance: 170,
            boot_space: 419,
            ecm: 'Bosch MED17.5.22',
            colors: [
              { name: 'Calgary White', color_code: '#FFFFFF', color_type: 'solid' },
              { name: 'Seattle Silver', color_code: '#C0C0C0', color_type: 'metallic' },
              { name: 'Arizona Blue', color_code: '#0066CC', color_type: 'metallic' },
              { name: 'Manhattan Orange', color_code: '#FF6600', color_type: 'metallic' },
              { name: 'Seattle Silver Dual Tone', color_code: '#C0C0C0', color_type: 'metallic' }
            ]
          },
          {
            name: 'XZ',
            variant_code: 'XZ',
            engine_type: 'petrol',
            engine_capacity: '1.2L Revotron',
            transmission: 'manual',
            fuel_type: 'petrol',
            power_bhp: 85,
            torque_nm: 114,
            seating_capacity: 5,
            fuel_tank_capacity: 35,
            ground_clearance: 170,
            boot_space: 419,
            ecm: 'Bosch MED17.5.22',
            colors: [
              { name: 'Calgary White', color_code: '#FFFFFF', color_type: 'solid' },
              { name: 'Seattle Silver', color_code: '#C0C0C0', color_type: 'metallic' },
              { name: 'Arizona Blue', color_code: '#0066CC', color_type: 'metallic' },
              { name: 'Manhattan Orange', color_code: '#FF6600', color_type: 'metallic' },
              { name: 'Seattle Silver Dual Tone', color_code: '#C0C0C0', color_type: 'metallic' },
              { name: 'Arizona Blue Dual Tone', color_code: '#0066CC', color_type: 'metallic' }
            ]
          },
          {
            name: 'XZ+',
            variant_code: 'XZ+',
            engine_type: 'petrol',
            engine_capacity: '1.2L Revotron',
            transmission: 'manual',
            fuel_type: 'petrol',
            power_bhp: 85,
            torque_nm: 114,
            seating_capacity: 5,
            fuel_tank_capacity: 35,
            ground_clearance: 170,
            boot_space: 419,
            ecm: 'Bosch MED17.5.22',
            colors: [
              { name: 'Calgary White', color_code: '#FFFFFF', color_type: 'solid' },
              { name: 'Seattle Silver', color_code: '#C0C0C0', color_type: 'metallic' },
              { name: 'Arizona Blue', color_code: '#0066CC', color_type: 'metallic' },
              { name: 'Manhattan Orange', color_code: '#FF6600', color_type: 'metallic' },
              { name: 'Seattle Silver Dual Tone', color_code: '#C0C0C0', color_type: 'metallic' },
              { name: 'Arizona Blue Dual Tone', color_code: '#0066CC', color_type: 'metallic' }
            ]
          },
          {
            name: 'XZ+ AMT',
            variant_code: 'XZ+_AMT',
            engine_type: 'petrol',
            engine_capacity: '1.2L Revotron',
            transmission: 'automatic',
            fuel_type: 'petrol',
            power_bhp: 85,
            torque_nm: 114,
            seating_capacity: 5,
            fuel_tank_capacity: 35,
            ground_clearance: 170,
            boot_space: 419,
            ecm: 'Bosch MED17.5.22',
            colors: [
              { name: 'Calgary White', color_code: '#FFFFFF', color_type: 'solid' },
              { name: 'Seattle Silver', color_code: '#C0C0C0', color_type: 'metallic' },
              { name: 'Arizona Blue', color_code: '#0066CC', color_type: 'metallic' },
              { name: 'Manhattan Orange', color_code: '#FF6600', color_type: 'metallic' },
              { name: 'Seattle Silver Dual Tone', color_code: '#C0C0C0', color_type: 'metallic' },
              { name: 'Arizona Blue Dual Tone', color_code: '#0066CC', color_type: 'metallic' }
            ]
          }
        ]
      },
      {
        name: 'Altroz',
        year_start: 2020,
        year_end: 2024,
        body_type: 'hatchback',
        variants: [
          {
            name: 'XE',
            variant_code: 'XE',
            engine_type: 'petrol',
            engine_capacity: '1.2L Revotron',
            transmission: 'manual',
            fuel_type: 'petrol',
            power_bhp: 86,
            torque_nm: 113,
            seating_capacity: 5,
            fuel_tank_capacity: 37,
            ground_clearance: 165,
            boot_space: 345,
            ecm: 'Bosch MED17.5.22',
            colors: [
              { name: 'Calgary White', color_code: '#FFFFFF', color_type: 'solid' },
              { name: 'Seattle Silver', color_code: '#C0C0C0', color_type: 'metallic' },
              { name: 'Arizona Blue', color_code: '#0066CC', color_type: 'metallic' },
              { name: 'Manhattan Orange', color_code: '#FF6600', color_type: 'metallic' }
            ]
          },
          {
            name: 'XM',
            variant_code: 'XM',
            engine_type: 'petrol',
            engine_capacity: '1.2L Revotron',
            transmission: 'manual',
            fuel_type: 'petrol',
            power_bhp: 86,
            torque_nm: 113,
            seating_capacity: 5,
            fuel_tank_capacity: 37,
            ground_clearance: 165,
            boot_space: 345,
            ecm: 'Bosch MED17.5.22',
            colors: [
              { name: 'Calgary White', color_code: '#FFFFFF', color_type: 'solid' },
              { name: 'Seattle Silver', color_code: '#C0C0C0', color_type: 'metallic' },
              { name: 'Arizona Blue', color_code: '#0066CC', color_type: 'metallic' },
              { name: 'Manhattan Orange', color_code: '#FF6600', color_type: 'metallic' },
              { name: 'Seattle Silver Dual Tone', color_code: '#C0C0C0', color_type: 'metallic' }
            ]
          },
          {
            name: 'XZ',
            variant_code: 'XZ',
            engine_type: 'petrol',
            engine_capacity: '1.2L Revotron',
            transmission: 'manual',
            fuel_type: 'petrol',
            power_bhp: 86,
            torque_nm: 113,
            seating_capacity: 5,
            fuel_tank_capacity: 37,
            ground_clearance: 165,
            boot_space: 345,
            ecm: 'Bosch MED17.5.22',
            colors: [
              { name: 'Calgary White', color_code: '#FFFFFF', color_type: 'solid' },
              { name: 'Seattle Silver', color_code: '#C0C0C0', color_type: 'metallic' },
              { name: 'Arizona Blue', color_code: '#0066CC', color_type: 'metallic' },
              { name: 'Manhattan Orange', color_code: '#FF6600', color_type: 'metallic' },
              { name: 'Seattle Silver Dual Tone', color_code: '#C0C0C0', color_type: 'metallic' },
              { name: 'Arizona Blue Dual Tone', color_code: '#0066CC', color_type: 'metallic' }
            ]
          },
          {
            name: 'XZ+',
            variant_code: 'XZ+',
            engine_type: 'petrol',
            engine_capacity: '1.2L Revotron',
            transmission: 'manual',
            fuel_type: 'petrol',
            power_bhp: 86,
            torque_nm: 113,
            seating_capacity: 5,
            fuel_tank_capacity: 37,
            ground_clearance: 165,
            boot_space: 345,
            ecm: 'Bosch MED17.5.22',
            colors: [
              { name: 'Calgary White', color_code: '#FFFFFF', color_type: 'solid' },
              { name: 'Seattle Silver', color_code: '#C0C0C0', color_type: 'metallic' },
              { name: 'Arizona Blue', color_code: '#0066CC', color_type: 'metallic' },
              { name: 'Manhattan Orange', color_code: '#FF6600', color_type: 'metallic' },
              { name: 'Seattle Silver Dual Tone', color_code: '#C0C0C0', color_type: 'metallic' },
              { name: 'Arizona Blue Dual Tone', color_code: '#0066CC', color_type: 'metallic' }
            ]
          },
          {
            name: 'XZ+ AMT',
            variant_code: 'XZ+_AMT',
            engine_type: 'petrol',
            engine_capacity: '1.2L Revotron',
            transmission: 'automatic',
            fuel_type: 'petrol',
            power_bhp: 86,
            torque_nm: 113,
            seating_capacity: 5,
            fuel_tank_capacity: 37,
            ground_clearance: 165,
            boot_space: 345,
            ecm: 'Bosch MED17.5.22',
            colors: [
              { name: 'Calgary White', color_code: '#FFFFFF', color_type: 'solid' },
              { name: 'Seattle Silver', color_code: '#C0C0C0', color_type: 'metallic' },
              { name: 'Arizona Blue', color_code: '#0066CC', color_type: 'metallic' },
              { name: 'Manhattan Orange', color_code: '#FF6600', color_type: 'metallic' },
              { name: 'Seattle Silver Dual Tone', color_code: '#C0C0C0', color_type: 'metallic' },
              { name: 'Arizona Blue Dual Tone', color_code: '#0066CC', color_type: 'metallic' }
            ]
          }
        ]
      }
    ];

    // Insert models and variants
    for (const model of tataModels) {
      console.log(`Inserting ${model.name} model...`);
      
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

    console.log('Tata cars population completed successfully!');
  } catch (error) {
    console.error('Failed to populate Tata cars:', error);
    throw error;
  }
};

// Run the population if this file is executed directly
if (require.main === module) {
  populateTataCars()
    .then(() => {
      console.log('Tata cars population completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Tata cars population failed:', error);
      process.exit(1);
    });
}

export { populateTataCars };

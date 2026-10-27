import { query, closePool } from './init-connection';
import fs from 'fs';
import path from 'path';

const initializeDatabase = async () => {
  try {
    console.log('Initializing database...');
    
    // Read and execute the schema file
    let schemaPath = path.join(__dirname, 'schema.sql');
    if (!fs.existsSync(schemaPath)) {
      schemaPath = path.join(__dirname, '..', '..', 'src', 'database', 'schema.sql');
    }
    if (!fs.existsSync(schemaPath)) {
      schemaPath = path.join(process.cwd(), 'src', 'database', 'schema.sql');
    }
    if (!fs.existsSync(schemaPath)) {
      schemaPath = path.join(process.cwd(), 'backend', 'src', 'database', 'schema.sql');
    }
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    // Execute the entire schema at once
    await query(schema);
    
    // Ensure all required columns and tables exist even if DB was already partially created
    await query(`
      ALTER TABLE spare_parts ADD COLUMN IF NOT EXISTS description TEXT;
      ALTER TABLE spare_parts ADD COLUMN IF NOT EXISTS unit VARCHAR(20) DEFAULT 'pieces';
      ALTER TABLE spare_parts ADD COLUMN IF NOT EXISTS unit_type VARCHAR(20) DEFAULT 'discrete';
      ALTER TABLE services ADD COLUMN IF NOT EXISTS duration INTEGER DEFAULT 60;
      
      CREATE TABLE IF NOT EXISTS customer_vehicles (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
        make_id UUID REFERENCES vehicle_makes(id) ON DELETE SET NULL,
        model_id UUID REFERENCES vehicle_models(id) ON DELETE SET NULL,
        variant_id UUID REFERENCES vehicle_variants(id) ON DELETE SET NULL,
        color_id UUID REFERENCES vehicle_colors(id) ON DELETE SET NULL,
        license_plate VARCHAR(50),
        vin VARCHAR(50),
        year INTEGER,
        is_primary BOOLEAN DEFAULT false,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      ALTER TABLE customer_vehicles ADD COLUMN IF NOT EXISTS vin VARCHAR(50);
      ALTER TABLE customer_vehicles ADD COLUMN IF NOT EXISTS year INTEGER;
      ALTER TABLE customer_vehicles ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
      ALTER TABLE customer_vehicles ADD COLUMN IF NOT EXISTS is_primary BOOLEAN DEFAULT false;
      ALTER TABLE bills ADD COLUMN IF NOT EXISTS vehicle_id UUID REFERENCES customer_vehicles(id) ON DELETE SET NULL;
      ALTER TABLE vehicle_variants ADD COLUMN IF NOT EXISTS ecm VARCHAR(100);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS scopes JSONB DEFAULT '[]'::jsonb;
      
      -- Initialize default scopes for existing users if empty
      UPDATE users SET scopes = '["dashboard", "bills", "customers", "spare_parts", "services", "financial", "users"]'::jsonb WHERE role = 'MANAGER' AND (scopes IS NULL OR scopes = '[]'::jsonb);
      UPDATE users SET scopes = '["dashboard", "bills", "customers", "spare_parts", "services"]'::jsonb WHERE role = 'TECHNICIAN' AND (scopes IS NULL OR scopes = '[]'::jsonb);
      UPDATE users SET scopes = '["bills"]'::jsonb WHERE role = 'CUSTOMER' AND (scopes IS NULL OR scopes = '[]'::jsonb);

      ALTER TABLE customers ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE SET NULL;

      -- Sync all users with role 'CUSTOMER' to customers table
      INSERT INTO customers (name, phone, email, user_id)
      SELECT u.name, u.phone, u.email, u.id
      FROM users u
      WHERE u.role = 'CUSTOMER'
        AND NOT EXISTS (SELECT 1 FROM customers c WHERE c.phone = u.phone);

      -- Link existing customers by phone to their user account
      UPDATE customers c
      SET user_id = u.id
      FROM users u
      WHERE c.phone = u.phone AND (c.user_id IS NULL OR c.user_id != u.id);

      -- Job Cards table
      CREATE TABLE IF NOT EXISTS job_cards (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          job_card_number VARCHAR(50) UNIQUE NOT NULL,
          customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
          vehicle_id UUID REFERENCES customer_vehicles(id) ON DELETE SET NULL,
          status VARCHAR(30) DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'ESTIMATED', 'IN_PROGRESS', 'COMPLETED', 'INVOICED', 'CANCELLED')),
          priority VARCHAR(20) DEFAULT 'NORMAL' CHECK (priority IN ('LOW', 'NORMAL', 'HIGH', 'URGENT')),
          odometer_reading INTEGER DEFAULT 0,
          fuel_level VARCHAR(20) DEFAULT '50%',
          customer_complaints TEXT,
          technician_diagnosis TEXT,
          inventory_checklist JSONB DEFAULT '{"spare_wheel": true, "toolkit": true, "jack": true, "stereo": true, "floor_mats": true}'::jsonb,
          visual_inspection_notes TEXT,
          estimated_amount DECIMAL(10,2) DEFAULT 0,
          actual_amount DECIMAL(10,2) DEFAULT 0,
          customer_approved BOOLEAN DEFAULT false,
          customer_approved_at TIMESTAMP,
          expected_delivery_date TIMESTAMP,
          actual_delivery_date TIMESTAMP,
          bill_id UUID REFERENCES bills(id) ON DELETE SET NULL,
          created_by UUID REFERENCES users(id) ON DELETE SET NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Multi-technician assignment (stored in job card only, NOT carried over to invoice)
      CREATE TABLE IF NOT EXISTS job_card_technicians (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          job_card_id UUID NOT NULL REFERENCES job_cards(id) ON DELETE CASCADE,
          technician_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          role VARCHAR(50) DEFAULT 'TECHNICIAN',
          assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(job_card_id, technician_id)
      );

      -- Job Card Services / Labor
      CREATE TABLE IF NOT EXISTS job_card_services (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          job_card_id UUID NOT NULL REFERENCES job_cards(id) ON DELETE CASCADE,
          service_id UUID REFERENCES services(id) ON DELETE SET NULL,
          service_name VARCHAR(255) NOT NULL,
          description TEXT,
          hours_qty DECIMAL(10,2) DEFAULT 1,
          unit_price DECIMAL(10,2) NOT NULL DEFAULT 0,
          total_price DECIMAL(10,2) NOT NULL DEFAULT 0,
          is_extra_work BOOLEAN DEFAULT false,
          technician_id UUID REFERENCES users(id) ON DELETE SET NULL,
          status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'IN_PROGRESS', 'COMPLETED')),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Job Card Spare Parts & Materials
      CREATE TABLE IF NOT EXISTS job_card_spare_parts (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          job_card_id UUID NOT NULL REFERENCES job_cards(id) ON DELETE CASCADE,
          spare_part_id UUID REFERENCES spare_parts(id) ON DELETE SET NULL,
          part_name VARCHAR(255) NOT NULL,
          part_number VARCHAR(100),
          description TEXT,
          quantity DECIMAL(10,3) NOT NULL DEFAULT 1,
          unit VARCHAR(20) DEFAULT 'pieces',
          unit_price DECIMAL(10,2) NOT NULL DEFAULT 0,
          total_price DECIMAL(10,2) NOT NULL DEFAULT 0,
          is_extra_work BOOLEAN DEFAULT false,
          status VARCHAR(20) DEFAULT 'REQUESTED' CHECK (status IN ('REQUESTED', 'ISSUED', 'INSTALLED')),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_job_cards_customer_id ON job_cards(customer_id);
      CREATE INDEX IF NOT EXISTS idx_job_cards_vehicle_id ON job_cards(vehicle_id);
      CREATE INDEX IF NOT EXISTS idx_job_cards_status ON job_cards(status);
      CREATE INDEX IF NOT EXISTS idx_job_cards_bill_id ON job_cards(bill_id);
      CREATE INDEX IF NOT EXISTS idx_job_card_technicians_jc_id ON job_card_technicians(job_card_id);
      CREATE INDEX IF NOT EXISTS idx_job_card_technicians_tech_id ON job_card_technicians(technician_id);
      CREATE INDEX IF NOT EXISTS idx_job_card_services_jc_id ON job_card_services(job_card_id);
      CREATE INDEX IF NOT EXISTS idx_job_card_spare_parts_jc_id ON job_card_spare_parts(job_card_id);
    `);

    console.log('Database schema created and synchronized successfully');
    
    // Insert initial data
    await insertInitialData();
    
    console.log('Database initialization completed');
  } catch (error) {
    console.error('Database initialization failed:', error);
    throw error;
  }
};

const insertInitialData = async () => {
  try {
    // Check if users already exist
    try {
      const userCount = await query('SELECT COUNT(*) FROM users');
      if (userCount.rows[0].count > 0) {
        console.log('Initial data already exists, skipping...');
        return;
      }
    } catch (error) {
      // If users table doesn't exist yet, continue with insertion
      console.log('Users table not found, proceeding with initial data insertion...');
    }

    // Insert demo users
    const users = [
      {
        name: 'Manager User',
        phone: '1234567890',
        email: 'manager@wingsonwheels.com',
        password: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // password123
        role: 'MANAGER'
      },
      {
        name: 'Technician User',
        phone: '0987654321',
        email: 'technician@wingsonwheels.com',
        password: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // password123
        role: 'TECHNICIAN'
      },
      {
        name: 'Customer User',
        phone: '1122334455',
        email: 'customer@wingsonwheels.com',
        password: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // password123
        role: 'CUSTOMER'
      }
    ];

    for (const user of users) {
      await query(
        'INSERT INTO users (name, phone, email, password, role) VALUES ($1, $2, $3, $4, $5)',
        [user.name, user.phone, user.email, user.password, user.role]
      );
    }

    // Insert demo customer
    await query(
      'INSERT INTO customers (name, phone, email, address, vehicle_info) VALUES ($1, $2, $3, $4, $5)',
      [
        'John Doe',
        '1122334455',
        'john.doe@email.com',
        '123 Main St, City, State',
        JSON.stringify({
          make: 'Toyota',
          model: 'Camry',
          year: 2020,
          licensePlate: 'ABC123'
        })
      ]
    );

    // Insert demo services
    const services = [
      { name: 'Oil Change', description: 'Regular oil change service', base_price: 50.00 },
      { name: 'Brake Service', description: 'Brake pad replacement and inspection', base_price: 150.00 },
      { name: 'Engine Diagnostic', description: 'Complete engine diagnostic check', base_price: 80.00 },
      { name: 'Tire Rotation', description: 'Tire rotation and balancing', base_price: 30.00 },
      { name: 'AC Service', description: 'Air conditioning system service', base_price: 120.00 }
    ];

    for (const service of services) {
      await query(
        'INSERT INTO services (name, description, base_price) VALUES ($1, $2, $3)',
        [service.name, service.description, service.base_price]
      );
    }

    // Insert demo spare parts
    const spareParts = [
      { name: 'Oil Filter', part_number: 'OF-001', category: 'Engine', price: 15.00, cost: 10.00, stock_quantity: 50 },
      { name: 'Brake Pads', part_number: 'BP-002', category: 'Brakes', price: 80.00, cost: 60.00, stock_quantity: 20 },
      { name: 'Air Filter', part_number: 'AF-003', category: 'Engine', price: 25.00, cost: 18.00, stock_quantity: 30 },
      { name: 'Spark Plugs', part_number: 'SP-004', category: 'Engine', price: 12.00, cost: 8.00, stock_quantity: 100 },
      { name: 'AC Filter', part_number: 'ACF-005', category: 'AC', price: 35.00, cost: 25.00, stock_quantity: 15 }
    ];

    for (const part of spareParts) {
      await query(
        'INSERT INTO spare_parts (name, part_number, category, price, cost, stock_quantity) VALUES ($1, $2, $3, $4, $5, $6)',
        [part.name, part.part_number, part.category, part.price, part.cost, part.stock_quantity]
      );
    }

            // Insert sample vehicle data
            await insertVehicleData();
            
            console.log('Initial data inserted successfully');
          } catch (error) {
            console.error('Failed to insert initial data:', error);
            throw error;
          }
        };

        const insertVehicleData = async () => {
          try {
            // Insert vehicle makes
            const makes = [
              { name: 'Honda', country: 'Japan' },
              { name: 'Toyota', country: 'Japan' },
              { name: 'Maruti Suzuki', country: 'Japan' },
              { name: 'Hyundai', country: 'South Korea' },
              { name: 'Tata', country: 'India' },
              { name: 'Mahindra', country: 'India' },
              { name: 'Ford', country: 'USA' },
              { name: 'Volkswagen', country: 'Germany' }
            ];

            for (const make of makes) {
              await query(
                'INSERT INTO vehicle_makes (name, country) VALUES ($1, $2)',
                [make.name, make.country]
              );
            }

            // Get Honda make ID
            const hondaResult = await query('SELECT id FROM vehicle_makes WHERE name = $1', ['Honda']);
            const hondaId = hondaResult.rows[0].id;

            // Insert Honda models
            const hondaModels = [
              { name: 'City', year_start: 2014, year_end: 2024, body_type: 'sedan' },
              { name: 'Amaze', year_start: 2018, year_end: 2024, body_type: 'sedan' },
              { name: 'Jazz', year_start: 2015, year_end: 2020, body_type: 'hatchback' },
              { name: 'WR-V', year_start: 2017, year_end: 2024, body_type: 'crossover' }
            ];

            for (const model of hondaModels) {
              await query(
                'INSERT INTO vehicle_models (make_id, name, year_start, year_end, body_type) VALUES ($1, $2, $3, $4, $5)',
                [hondaId, model.name, model.year_start, model.year_end, model.body_type]
              );
            }

            // Get Honda City model ID
            const cityResult = await query('SELECT id FROM vehicle_models WHERE name = $1 AND make_id = $2', ['City', hondaId]);
            const cityId = cityResult.rows[0].id;

            // Insert Honda City variants
            const cityVariants = [
              {
                name: 'V MT',
                variant_code: 'V_MT',
                engine_type: 'petrol',
                engine_capacity: '1.5L',
                transmission: 'manual',
                fuel_type: 'petrol',
                power_bhp: 121,
                torque_nm: 145,
                seating_capacity: 5,
                fuel_tank_capacity: 40
              },
              {
                name: 'V CVT',
                variant_code: 'V_CVT',
                engine_type: 'petrol',
                engine_capacity: '1.5L',
                transmission: 'cvt',
                fuel_type: 'petrol',
                power_bhp: 121,
                torque_nm: 145,
                seating_capacity: 5,
                fuel_tank_capacity: 40
              },
              {
                name: 'ZX MT',
                variant_code: 'ZX_MT',
                engine_type: 'petrol',
                engine_capacity: '1.5L',
                transmission: 'manual',
                fuel_type: 'petrol',
                power_bhp: 121,
                torque_nm: 145,
                seating_capacity: 5,
                fuel_tank_capacity: 40
              }
            ];

            for (const variant of cityVariants) {
              await query(
                'INSERT INTO vehicle_variants (model_id, name, variant_code, engine_type, engine_capacity, transmission, fuel_type, power_bhp, torque_nm, seating_capacity, fuel_tank_capacity) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)',
                [cityId, variant.name, variant.variant_code, variant.engine_type, variant.engine_capacity, variant.transmission, variant.fuel_type, variant.power_bhp, variant.torque_nm, variant.seating_capacity, variant.fuel_tank_capacity]
              );
            }

            // Get V MT variant ID
            const vMtResult = await query('SELECT id FROM vehicle_variants WHERE name = $1 AND model_id = $2', ['V MT', cityId]);
            const vMtId = vMtResult.rows[0].id;

            // Insert colors for V MT variant
            const colors = [
              { name: 'Rallye Red', color_code: '#C8102E', color_type: 'metallic' },
              { name: 'Platinum White Pearl', color_code: '#FFFFFF', color_type: 'pearl' },
              { name: 'Lunar Silver Metallic', color_code: '#C0C0C0', color_type: 'metallic' },
              { name: 'Golden Brown Metallic', color_code: '#8B4513', color_type: 'metallic' }
            ];

            for (const color of colors) {
              await query(
                'INSERT INTO vehicle_colors (variant_id, name, color_code, color_type) VALUES ($1, $2, $3, $4)',
                [vMtId, color.name, color.color_code, color.color_type]
              );
            }

            console.log('Vehicle data inserted successfully');
          } catch (error) {
            console.error('Failed to insert vehicle data:', error);
            throw error;
          }
        };

// Export functions
export { initializeDatabase, closePool };

// Run initialization if this file is executed directly
if (require.main === module) {
  initializeDatabase()
    .then(() => {
      console.log('Database initialization completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Database initialization failed:', error);
      process.exit(1);
    });
}

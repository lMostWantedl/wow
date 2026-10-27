import { query, closePool } from './init-connection';

const createJobCardTables = async () => {
  try {
    console.log('Creating Job Card tables...');

    await query(`
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

      CREATE TABLE IF NOT EXISTS job_card_technicians (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          job_card_id UUID NOT NULL REFERENCES job_cards(id) ON DELETE CASCADE,
          technician_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          role VARCHAR(50) DEFAULT 'TECHNICIAN',
          assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(job_card_id, technician_id)
      );

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

      DROP TRIGGER IF EXISTS update_job_cards_updated_at ON job_cards;
      CREATE TRIGGER update_job_cards_updated_at BEFORE UPDATE ON job_cards FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `);

    console.log('Job Card tables created successfully');
  } catch (error) {
    console.error('Failed to create Job Card tables:', error);
    throw error;
  } finally {
    await closePool();
  }
};

if (require.main === module) {
  createJobCardTables()
    .then(() => {
      console.log('Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

export default createJobCardTables;

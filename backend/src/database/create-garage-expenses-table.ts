import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function runMigration() {
  const client = await pool.connect();
  try {
    console.log('Creating garage_expenses table...');

    await client.query(`
      CREATE TABLE IF NOT EXISTS garage_expenses (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        expense_number VARCHAR(50) UNIQUE NOT NULL,
        title VARCHAR(255) NOT NULL,
        category VARCHAR(50) NOT NULL,
        expense_type VARCHAR(20) NOT NULL DEFAULT 'OPEX',
        amount DECIMAL(12, 2) NOT NULL,
        expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
        payment_method VARCHAR(50) NOT NULL DEFAULT 'CASH',
        payee_recipient VARCHAR(255),
        user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        invoice_reference VARCHAR(100),
        notes TEXT,
        is_recurring BOOLEAN DEFAULT FALSE,
        recurring_frequency VARCHAR(50),
        created_by UUID REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_garage_expenses_date ON garage_expenses(expense_date);
      CREATE INDEX IF NOT EXISTS idx_garage_expenses_category ON garage_expenses(category);
      CREATE INDEX IF NOT EXISTS idx_garage_expenses_type ON garage_expenses(expense_type);
      CREATE INDEX IF NOT EXISTS idx_garage_expenses_user ON garage_expenses(user_id);
    `);

    console.log('garage_expenses table created successfully.');

    // Seed realistic garage operational expenses if table is empty
    const checkCount = await client.query('SELECT COUNT(*) FROM garage_expenses');
    if (parseInt(checkCount.rows[0].count) === 0) {
      console.log('Seeding initial garage setup, rent, tools, and salary records...');

      // Find a technician and manager for salaries
      const userRes = await client.query("SELECT id, name, role FROM users WHERE role IN ('MANAGER', 'TECHNICIAN')");
      const users = userRes.rows;
      const manager = users.find(u => u.role === 'MANAGER') || users[0];
      const technician = users.find(u => u.role === 'TECHNICIAN') || users[0];

      const initialExpenses = [
        {
          num: 'EXP-CAPEX-0001',
          title: 'Initial Garage Setup, Civil & Flooring Work',
          category: 'CAPEX_SETUP',
          type: 'CAPEX',
          amount: 250000,
          date: '2026-08-01',
          method: 'BANK_TRANSFER',
          payee: 'Apex Industrial Civil Works',
          ref: 'INV-CIVIL-2026',
          notes: 'Epoxy flooring, hydraulic bay pits, and lighting setup'
        },
        {
          num: 'EXP-CAPEX-0002',
          title: 'Hydraulic 2-Post Car Lift & Air Compressor (4HP)',
          category: 'TOOLS_EQUIPMENT',
          type: 'CAPEX',
          amount: 180000,
          date: '2026-08-05',
          method: 'BANK_TRANSFER',
          payee: 'Bosch Workshop Equipment India',
          ref: 'BOSCH-EQ-8841',
          notes: 'Heavy duty 4-ton 2-post lift with 3-year warranty'
        },
        {
          num: 'EXP-CAPEX-0003',
          title: 'OBD-II Multi-Brand Diagnostic Computer Scanner Tool',
          category: 'TOOLS_EQUIPMENT',
          type: 'CAPEX',
          amount: 65000,
          date: '2026-08-10',
          method: 'CARD',
          payee: 'Launch Tech Diagnostics',
          ref: 'LT-SCAN-902',
          notes: 'Full system ECU programming and bidirectional scanning tablet'
        },
        {
          num: 'EXP-RENT-0001',
          title: 'Monthly Workshop Rent - August 2026',
          category: 'RENT',
          type: 'OPEX',
          amount: 35000,
          date: '2026-08-05',
          method: 'BANK_TRANSFER',
          payee: 'Garage Property Landlord',
          ref: 'RENT-AUG-26',
          notes: '5000 sq ft main road bay space'
        },
        {
          num: 'EXP-RENT-0002',
          title: 'Monthly Workshop Rent - September 2026',
          category: 'RENT',
          type: 'OPEX',
          amount: 35000,
          date: '2026-09-05',
          method: 'BANK_TRANSFER',
          payee: 'Garage Property Landlord',
          ref: 'RENT-SEP-26',
          notes: 'Monthly workshop premises rent'
        },
        {
          num: 'EXP-RENT-0003',
          title: 'Monthly Workshop Rent - October 2026',
          category: 'RENT',
          type: 'OPEX',
          amount: 35000,
          date: '2026-10-05',
          method: 'BANK_TRANSFER',
          payee: 'Garage Property Landlord',
          ref: 'RENT-OCT-26',
          notes: 'Current month workshop premises rent'
        },
        {
          num: 'EXP-SAL-0001',
          title: `Monthly Salary - ${technician ? technician.name : 'Dhanush'} (Head Mechanic)`,
          category: 'SALARY',
          type: 'OPEX',
          amount: 28000,
          date: '2026-10-01',
          method: 'BANK_TRANSFER',
          payee: technician ? technician.name : 'Dhanush',
          userId: technician ? technician.id : null,
          ref: 'SAL-OCT-26-01',
          notes: 'Monthly fixed salary + performance incentive'
        },
        {
          num: 'EXP-SAL-0002',
          title: `Monthly Salary - ${manager ? manager.name : 'Manager'} (Workshop Lead)`,
          category: 'SALARY',
          type: 'OPEX',
          amount: 38000,
          date: '2026-10-01',
          method: 'BANK_TRANSFER',
          payee: manager ? manager.name : 'Workshop Manager',
          userId: manager ? manager.id : null,
          ref: 'SAL-OCT-26-02',
          notes: 'Operations & customer management salary'
        },
        {
          num: 'EXP-UTIL-0001',
          title: 'Commercial 3-Phase Electricity Bill (Compressor & Lighting)',
          category: 'UTILITIES',
          type: 'OPEX',
          amount: 6200,
          date: '2026-10-12',
          method: 'UPI',
          payee: 'State Electricity Board',
          ref: 'EB-OCT-44109',
          notes: '3-phase commercial tariff power consumption'
        },
        {
          num: 'EXP-TOOL-0001',
          title: 'Pneumatic 1/2" Air Impact Wrench Set & Sockets',
          category: 'TOOLS_EQUIPMENT',
          type: 'OPEX',
          amount: 8500,
          date: '2026-10-15',
          method: 'CASH',
          payee: 'National Hardware & Tools',
          ref: 'RCP-NH-551',
          notes: 'Tyre changing and suspension high-torque pneumatic wrenches'
        },
        {
          num: 'EXP-CONS-0001',
          title: 'Workshop Consumables: Brake Cleaners, Degreasers, Rags & Gloves',
          category: 'CONSUMABLES',
          type: 'OPEX',
          amount: 3200,
          date: '2026-10-18',
          method: 'CASH',
          payee: 'AutoCare Chem Supplies',
          ref: 'CH-8991',
          notes: 'Monthly cleaning and chemical consumables'
        }
      ];

      for (const item of initialExpenses) {
        await client.query(`
          INSERT INTO garage_expenses (
            expense_number, title, category, expense_type, amount,
            expense_date, payment_method, payee_recipient, user_id,
            invoice_reference, notes
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          ON CONFLICT (expense_number) DO NOTHING
        `, [
          item.num,
          item.title,
          item.category,
          item.type,
          item.amount,
          item.date,
          item.method,
          item.payee,
          item.userId || null,
          item.ref,
          item.notes
        ]);
      }
      console.log('Seeded sample garage expenses successfully.');
    }

  } catch (err) {
    console.error('Migration error:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration().then(() => {
  console.log('Migration complete.');
  process.exit(0);
}).catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});

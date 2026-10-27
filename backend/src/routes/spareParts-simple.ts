import express from 'express';
import { query } from '../database/connection';
import { AuthRequest, requireRole } from '../middleware/auth';
import Joi from 'joi';

const router = express.Router();

// Validation schemas
const createSparePartSchema = Joi.object({
  name: Joi.string().required(),
  partNumber: Joi.string().allow('').optional(),
  category: Joi.string().required(),
  price: Joi.number().min(0).required(),
  cost: Joi.number().min(0).required(),
  stock: Joi.number().min(0).default(0),
  minStock: Joi.number().min(0).default(5),
  unit: Joi.string().valid('pieces', 'sets', 'pairs', 'liters', 'ml', 'kg', 'grams', 'gallons', 'quarts', 'pints', 'lbs', 'oz').default('pieces'),
  unitType: Joi.string().valid('discrete', 'liquid', 'weight').default('discrete'),
  supplier: Joi.string().allow('').optional(),
  description: Joi.string().allow('').optional()
});

// Get all spare parts
router.get('/', async (req: AuthRequest, res) => {
  try {
    const { category, search, lowStock } = req.query;
    
    let queryText = 'SELECT * FROM spare_parts WHERE is_active = true';
    let params: any[] = [];
    let paramCount = 0;

    if (category) {
      paramCount++;
      queryText += ` AND category = $${paramCount}`;
      params.push(category);
    }

    if (search) {
      paramCount++;
      queryText += ` AND (name ILIKE $${paramCount} OR part_number ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }

    if (lowStock === 'true') {
      queryText += ' AND stock_quantity <= min_stock_level';
    }

    queryText += ' ORDER BY name';

    const result = await query(queryText, params);
    
    // Map database field names to frontend expected field names
    const mappedSpareParts = result.rows.map(part => ({
      ...part,
      partNumber: part.part_number,
      stock: part.stock_quantity,
      minStock: part.min_stock_level,
      unit: part.unit,
      unitType: part.unit_type,
      isActive: part.is_active,
      createdAt: part.created_at,
      updatedAt: part.updated_at
    }));
    
    res.json({ spareParts: mappedSpareParts });
  } catch (error) {
    console.error('Get spare parts error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export const DEFAULT_SPARE_PART_CATEGORIES = [
  'Air Conditioning (AC)',
  'Air Intake & Turbocharger',
  'Audio, Navigation & Electronics',
  'Batteries & Charging',
  'Belts, Chains & Pulleys',
  'Body Panels & Exterior',
  'Brakes & Braking System',
  'Clutch & Flywheel',
  'Cooling & Heating System',
  'Electrical, Wiring & Relays',
  'Engine & Mechanical Components',
  'Exhaust & Emission Control',
  'Filters (Oil, Air, Cabin, Fuel)',
  'Fluids, Lubricants & Chemicals',
  'Fuel System & Injection',
  'Glass, Mirrors & Wipers',
  'Hardware, Fasteners & Clamps',
  'Hoses, Pipes & Fittings',
  'Ignition & Spark Plugs',
  'Interior, Dashboard & Trim',
  'Lighting & Bulbs',
  'Safety & Airbags',
  'Sensors, Switches & ECUs',
  'Steering System',
  'Suspension & Arms',
  'Transmission, Gearbox & Drivetrain',
  'Wheels, Tyres & Hubs',
  'Other / Miscellaneous'
];

let categoryTableChecked = false;
async function ensureCategoryTable() {
  if (categoryTableChecked) return;
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS spare_part_categories (
        name VARCHAR(100) PRIMARY KEY,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    categoryTableChecked = true;
  } catch (err) {
    console.warn('Could not ensure spare_part_categories table:', err);
  }
}

// Get categories
router.get('/categories', async (req: AuthRequest, res) => {
  try {
    await ensureCategoryTable();

    // Get categories from spare_parts
    const dbResult = await query(
      'SELECT DISTINCT category FROM spare_parts WHERE is_active = true AND category IS NOT NULL'
    );
    const dbCategories = dbResult.rows.map((row: any) => row.category);

    // Get categories from spare_part_categories table
    let customCategories: string[] = [];
    try {
      const customResult = await query('SELECT name FROM spare_part_categories');
      customCategories = customResult.rows.map((row: any) => row.name);
    } catch {
      // ignore
    }

    // Merge default, DB, and custom categories
    const categoriesSet = new Set<string>([
      ...DEFAULT_SPARE_PART_CATEGORIES,
      ...dbCategories,
      ...customCategories
    ]);

    const categories = Array.from(categoriesSet)
      .filter((cat): cat is string => typeof cat === 'string' && cat.trim().length > 0)
      .sort((a, b) => a.localeCompare(b));

    res.json({ categories });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Create new category
router.post('/categories', requireRole(['TECHNICIAN', 'MANAGER']), async (req: AuthRequest, res) => {
  try {
    const { name } = req.body;
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ message: 'Category name is required' });
    }
    const cleanName = name.trim();
    await ensureCategoryTable();
    await query(
      'INSERT INTO spare_part_categories (name) VALUES ($1) ON CONFLICT (name) DO NOTHING',
      [cleanName]
    );
    res.status(201).json({ message: 'Category added successfully', category: cleanName });
  } catch (error) {
    console.error('Create category error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get spare part by ID
router.get('/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    
    const result = await query(
      'SELECT * FROM spare_parts WHERE id = $1 AND is_active = true',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Spare part not found' });
    }
    
    // Map database field names to frontend expected field names
    const sparePart = result.rows[0];
    const mappedSparePart = {
      ...sparePart,
      partNumber: sparePart.part_number,
      stock: sparePart.stock_quantity,
      minStock: sparePart.min_stock_level,
      unit: sparePart.unit,
      unitType: sparePart.unit_type,
      isActive: sparePart.is_active,
      createdAt: sparePart.created_at,
      updatedAt: sparePart.updated_at
    };
    
    res.json({ sparePart: mappedSparePart });
  } catch (error) {
    console.error('Get spare part error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Create new spare part
router.post('/', requireRole(['TECHNICIAN', 'MANAGER']), async (req: AuthRequest, res) => {
  try {
    const { error, value } = createSparePartSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const { name, partNumber, category, price, cost, stock, minStock, unit, unitType, supplier, description } = value;

    // Check if spare part already exists (only if partNumber is provided)
    if (partNumber && partNumber.trim() !== '') {
      const existingPart = await query(
        'SELECT id FROM spare_parts WHERE part_number = $1',
        [partNumber]
      );
      
      if (existingPart.rows.length > 0) {
        return res.status(400).json({ message: 'Spare part with this part number already exists' });
      }
    }

    // Create spare part
    const result = await query(
      'INSERT INTO spare_parts (name, part_number, category, price, cost, stock_quantity, min_stock_level, unit, unit_type, supplier, description) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *',
      [name, partNumber || null, category, price, cost, stock || 0, minStock !== undefined ? minStock : 5, unit || 'pieces', unitType || 'discrete', supplier || null, description || null]
    );

    // Map database field names to frontend expected field names
    const sparePart = result.rows[0];
    const mappedSparePart = {
      ...sparePart,
      partNumber: sparePart.part_number,
      stock: sparePart.stock_quantity,
      minStock: sparePart.min_stock_level,
      unit: sparePart.unit,
      unitType: sparePart.unit_type,
      isActive: sparePart.is_active,
      createdAt: sparePart.created_at,
      updatedAt: sparePart.updated_at
    };
    
    res.status(201).json({ sparePart: mappedSparePart });
  } catch (error) {
    console.error('Create spare part error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Update spare part
router.put('/:id', requireRole(['TECHNICIAN', 'MANAGER']), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { error, value } = createSparePartSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const { name, partNumber, category, price, cost, stock, minStock, unit, unitType, supplier, description } = value;

    // Check if spare part exists
    const existingPart = await query('SELECT id FROM spare_parts WHERE id = $1', [id]);
    if (existingPart.rows.length === 0) {
      return res.status(404).json({ message: 'Spare part not found' });
    }

    // Check if part number already exists (only if partNumber is provided and different from current)
    if (partNumber && partNumber.trim() !== '') {
      const existingPartNumber = await query(
        'SELECT id FROM spare_parts WHERE part_number = $1 AND id != $2',
        [partNumber, id]
      );
      
      if (existingPartNumber.rows.length > 0) {
        return res.status(400).json({ message: 'Spare part with this part number already exists' });
      }
    }

    // Update spare part
    const result = await query(
      'UPDATE spare_parts SET name = $1, part_number = $2, category = $3, price = $4, cost = $5, stock_quantity = $6, min_stock_level = $7, unit = $8, unit_type = $9, supplier = $10, description = $11, updated_at = CURRENT_TIMESTAMP WHERE id = $12 RETURNING *',
      [name, partNumber || null, category, price, cost, stock || 0, minStock !== undefined ? minStock : 5, unit || 'pieces', unitType || 'discrete', supplier || null, description || null, id]
    );

    // Map database field names to frontend expected field names
    const sparePart = result.rows[0];
    const mappedSparePart = {
      ...sparePart,
      partNumber: sparePart.part_number,
      stock: sparePart.stock_quantity,
      minStock: sparePart.min_stock_level,
      unit: sparePart.unit,
      unitType: sparePart.unit_type,
      isActive: sparePart.is_active,
      createdAt: sparePart.created_at,
      updatedAt: sparePart.updated_at
    };
    
    res.json({ sparePart: mappedSparePart });
  } catch (error) {
    console.error('Update spare part error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Update stock
router.patch('/:id/stock', requireRole(['TECHNICIAN', 'MANAGER']), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { quantity, operation } = req.body;

    if (!['add', 'subtract', 'set'].includes(operation)) {
      return res.status(400).json({ message: 'Invalid operation. Use add, subtract, or set' });
    }

    // Get current stock
    const currentResult = await query('SELECT stock_quantity FROM spare_parts WHERE id = $1', [id]);
    if (currentResult.rows.length === 0) {
      return res.status(404).json({ message: 'Spare part not found' });
    }

    const currentStock = currentResult.rows[0].stock_quantity;
    let newStock;

    switch (operation) {
      case 'add':
        newStock = currentStock + quantity;
        break;
      case 'subtract':
        newStock = Math.max(0, currentStock - quantity);
        break;
      case 'set':
        newStock = Math.max(0, quantity);
        break;
    }

    // Update stock
    const result = await query(
      'UPDATE spare_parts SET stock_quantity = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      [newStock, id]
    );

    // Map database field names to frontend expected field names
    const sparePart = result.rows[0];
    const mappedSparePart = {
      ...sparePart,
      partNumber: sparePart.part_number,
      stock: sparePart.stock_quantity,
      minStock: sparePart.min_stock_level,
      unit: sparePart.unit,
      unitType: sparePart.unit_type,
      isActive: sparePart.is_active,
      createdAt: sparePart.created_at,
      updatedAt: sparePart.updated_at
    };

    res.json({ sparePart: mappedSparePart });
  } catch (error) {
    console.error('Update stock error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get low stock items
router.get('/alerts/low-stock', async (req: AuthRequest, res) => {
  try {
    const result = await query(
      'SELECT * FROM spare_parts WHERE stock_quantity <= min_stock_level AND is_active = true ORDER BY stock_quantity ASC'
    );
    
    res.json({ lowStockItems: result.rows });
  } catch (error) {
    console.error('Get low stock items error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;

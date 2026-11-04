import express from 'express';
import { query } from '../database/connection';
import { AuthRequest, requireRole, requireRoleOrScope } from '../middleware/auth';
import Joi from 'joi';

const router = express.Router();

// Validation schemas with car-specific brand, model, generation, and fitment
const createSparePartSchema = Joi.object({
  name: Joi.string().required(),
  partNumber: Joi.string().allow('', null).optional(),
  oemPartNumber: Joi.string().allow('', null).optional(),
  category: Joi.string().required(),
  make: Joi.string().allow('', null).default('Universal'),
  model: Joi.string().allow('', null).default('All Models'),
  generation: Joi.string().allow('', null).default('All Generations'),
  yearStart: Joi.alternatives().try(Joi.number().integer(), Joi.string().allow('', null), Joi.allow(null)).optional(),
  yearEnd: Joi.alternatives().try(Joi.number().integer(), Joi.string().allow('', null), Joi.allow(null)).optional(),
  variant: Joi.string().allow('', null).default('All Variants'),
  fuelType: Joi.string().allow('', null).default('All'),
  partType: Joi.string().allow('', null).default('OEM Genuine'),
  brand: Joi.string().allow('', null).default('OEM'),
  compatibilityNotes: Joi.string().allow('', null).optional(),
  makeId: Joi.string().uuid().allow('', null).optional(),
  modelId: Joi.string().uuid().allow('', null).optional(),
  price: Joi.number().min(0).required(),
  cost: Joi.number().min(0).required(),
  stock: Joi.number().min(0).default(0),
  minStock: Joi.number().min(0).default(5),
  unit: Joi.string().valid('pieces', 'sets', 'pairs', 'liters', 'ml', 'kg', 'grams', 'gallons', 'quarts', 'pints', 'lbs', 'oz').default('pieces'),
  unitType: Joi.string().valid('discrete', 'liquid', 'weight').default('discrete'),
  supplier: Joi.string().allow('', null).optional(),
  description: Joi.string().allow('', null).optional(),
  isUniversal: Joi.boolean().allow(null).optional(),
  is_universal: Joi.boolean().allow(null).optional()
}).unknown(true);

// Helper to map DB row to frontend camelCase object
export const mapSparePart = (part: any) => ({
  ...part,
  partNumber: part.part_number,
  oemPartNumber: part.oem_part_number || '',
  stock: part.stock_quantity != null ? parseFloat(part.stock_quantity) : 0,
  minStock: part.min_stock_level != null ? parseFloat(part.min_stock_level) : 5,
  unit: part.unit,
  unitType: part.unit_type,
  isActive: part.is_active,
  createdAt: part.created_at,
  updatedAt: part.updated_at,
  make: part.make || 'Universal',
  model: part.model || 'All Models',
  generation: part.generation || 'All Generations',
  yearStart: part.year_start,
  yearEnd: part.year_end,
  variant: part.variant || 'All Variants',
  fuelType: part.fuel_type || 'All',
  partType: part.part_type || 'OEM Genuine',
  brand: part.brand || 'OEM',
  compatibilityNotes: part.compatibility_notes || '',
  makeId: part.make_id,
  modelId: part.model_id
});

// Get all spare parts with advanced filtering (car make, model, generation, vehicle-compatible, search, category)
router.get('/', async (req: AuthRequest, res) => {
  try {
    const { category, search, make, model, generation, vehicleMake, vehicleModel, lowStock, page, limit } = req.query;
    
    let queryText = 'SELECT * FROM spare_parts WHERE is_active = true';
    let countQueryText = 'SELECT COUNT(*) as total FROM spare_parts WHERE is_active = true';
    let params: any[] = [];
    let countParams: any[] = [];
    let paramCount = 0;

    if (category && category !== 'ALL') {
      paramCount++;
      const catClause = ` AND category = $${paramCount}`;
      queryText += catClause;
      countQueryText += catClause;
      params.push(category);
      countParams.push(category);
    }

    if (make && make !== 'ALL') {
      paramCount++;
      const makeClause = ` AND (LOWER(make) = LOWER($${paramCount}) OR LOWER(make) = 'universal')`;
      queryText += makeClause;
      countQueryText += makeClause;
      params.push(make);
      countParams.push(make);
    }

    if (model && model !== 'ALL') {
      paramCount++;
      const modelClause = ` AND (LOWER(model) ILIKE $${paramCount} OR LOWER(model) = 'all models' OR LOWER(make) = 'universal')`;
      queryText += modelClause;
      countQueryText += modelClause;
      params.push(`%${model}%`);
      countParams.push(`%${model}%`);
    }

    if (generation && generation !== 'ALL') {
      paramCount++;
      const genClause = ` AND (LOWER(generation) ILIKE $${paramCount} OR LOWER(generation) = 'all generations')`;
      queryText += genClause;
      countQueryText += genClause;
      params.push(`%${generation}%`);
      countParams.push(`%${generation}%`);
    }

    // Vehicle specific filter for Job Cards: e.g. for a Maruti Swift, returns parts for Maruti Swift AND Universal parts
    if (vehicleMake && typeof vehicleMake === 'string' && vehicleMake.trim() !== '') {
      paramCount++;
      const vMakeClause = ` AND (LOWER(make) = LOWER($${paramCount}) OR LOWER(make) = 'universal')`;
      queryText += vMakeClause;
      countQueryText += vMakeClause;
      params.push(vehicleMake.trim());
      countParams.push(vehicleMake.trim());

      if (vehicleModel && typeof vehicleModel === 'string' && vehicleModel.trim() !== '') {
        paramCount++;
        const vModelClause = ` AND (LOWER(model) ILIKE $${paramCount} OR LOWER(model) = 'all models' OR LOWER(make) = 'universal')`;
        queryText += vModelClause;
        countQueryText += vModelClause;
        params.push(`%${vehicleModel.trim()}%`);
        countParams.push(`%${vehicleModel.trim()}%`);
      }
    }

    if (search && typeof search === 'string' && search.trim() !== '') {
      paramCount++;
      const term = `%${search.trim()}%`;
      const searchClause = ` AND (
        name ILIKE $${paramCount} 
        OR part_number ILIKE $${paramCount} 
        OR COALESCE(oem_part_number, '') ILIKE $${paramCount} 
        OR COALESCE(make, '') ILIKE $${paramCount} 
        OR COALESCE(model, '') ILIKE $${paramCount} 
        OR COALESCE(generation, '') ILIKE $${paramCount} 
        OR COALESCE(brand, '') ILIKE $${paramCount} 
        OR COALESCE(category, '') ILIKE $${paramCount} 
        OR COALESCE(description, '') ILIKE $${paramCount} 
        OR COALESCE(compatibility_notes, '') ILIKE $${paramCount}
      )`;
      queryText += searchClause;
      countQueryText += searchClause;
      params.push(term);
      countParams.push(term);
    }

    if (lowStock === 'true') {
      queryText += ' AND stock_quantity <= min_stock_level';
      countQueryText += ' AND stock_quantity <= min_stock_level';
    }

    queryText += ' ORDER BY make ASC, model ASC, name ASC';

    // Pagination
    const pageNum = page ? parseInt(page as string, 10) : 0;
    const limitNum = limit ? parseInt(limit as string, 10) : 0;

    const countResult = await query(countQueryText, countParams);
    const total = parseInt(countResult.rows[0]?.total || '0', 10);

    if (pageNum > 0 && limitNum > 0) {
      const offset = (pageNum - 1) * limitNum;
      paramCount++;
      queryText += ` LIMIT $${paramCount}`;
      params.push(limitNum);
      paramCount++;
      queryText += ` OFFSET $${paramCount}`;
      params.push(offset);
    }

    const result = await query(queryText, params);
    
    res.json({
      spareParts: result.rows.map(mapSparePart),
      pagination: {
        total,
        page: pageNum || 1,
        limit: limitNum || total,
        pages: limitNum > 0 ? Math.ceil(total / limitNum) : 1
      }
    });
  } catch (error) {
    console.error('Get spare parts error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Distinct vehicle compatibility list (makes, models, generations)
router.get('/vehicle-fits', async (req: AuthRequest, res) => {
  try {
    const makesResult = await query(`
      SELECT DISTINCT make FROM spare_parts WHERE is_active = true AND make IS NOT NULL AND make != '' ORDER BY make ASC
    `);
    const modelsResult = await query(`
      SELECT DISTINCT make, model, generation FROM spare_parts WHERE is_active = true AND model IS NOT NULL AND model != '' ORDER BY make ASC, model ASC
    `);

    res.json({
      makes: makesResult.rows.map(r => r.make),
      models: modelsResult.rows
    });
  } catch (error) {
    console.error('Get vehicle fits error:', error);
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
router.post('/categories', requireRoleOrScope(['TECHNICIAN', 'MANAGER'], 'spare_parts'), async (req: AuthRequest, res) => {
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
    
    res.json({ sparePart: mapSparePart(result.rows[0]) });
  } catch (error) {
    console.error('Get spare part error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Create new spare part (car specific)
router.post('/', requireRoleOrScope(['TECHNICIAN', 'MANAGER'], 'spare_parts'), async (req: AuthRequest, res) => {
  try {
    const { error, value } = createSparePartSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const {
      name,
      partNumber,
      oemPartNumber,
      category,
      make,
      model,
      generation,
      yearStart,
      yearEnd,
      variant,
      fuelType,
      partType,
      brand,
      compatibilityNotes,
      makeId,
      modelId,
      price,
      cost,
      stock,
      minStock,
      unit,
      unitType,
      supplier,
      description
    } = value;

    // Check if part number already exists (if provided)
    if (partNumber && partNumber.trim() !== '') {
      const existingPart = await query(
        'SELECT id FROM spare_parts WHERE part_number = $1 AND is_active = true',
        [partNumber.trim()]
      );
      
      if (existingPart.rows.length > 0) {
        return res.status(400).json({ message: 'A spare part with this part number already exists' });
      }
    }

    // Insert spare part
    const result = await query(`
      INSERT INTO spare_parts (
        name, part_number, oem_part_number, category,
        make, model, generation, year_start, year_end,
        variant, fuel_type, part_type, brand, compatibility_notes,
        make_id, model_id,
        price, cost, stock_quantity, min_stock_level,
        unit, unit_type, supplier, description
      ) VALUES (
        $1, $2, $3, $4,
        $5, $6, $7, $8, $9,
        $10, $11, $12, $13, $14,
        $15, $16,
        $17, $18, $19, $20,
        $21, $22, $23, $24
      ) RETURNING *
    `, [
      name.trim(),
      partNumber ? partNumber.trim() : null,
      oemPartNumber ? oemPartNumber.trim() : null,
      category,
      make || 'Universal',
      model || 'All Models',
      generation || 'All Generations',
      (yearStart && !isNaN(parseInt(yearStart, 10))) ? parseInt(yearStart, 10) : null,
      (yearEnd && !isNaN(parseInt(yearEnd, 10))) ? parseInt(yearEnd, 10) : null,
      variant || 'All Variants',
      fuelType || 'All',
      partType || 'OEM Genuine',
      brand || 'OEM',
      compatibilityNotes || null,
      makeId || null,
      modelId || null,
      price,
      cost,
      stock || 0,
      minStock !== undefined ? minStock : 5,
      unit || 'pieces',
      unitType || 'discrete',
      supplier || null,
      description || null
    ]);

    res.status(201).json({ sparePart: mapSparePart(result.rows[0]) });
  } catch (error) {
    console.error('Create spare part error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Update spare part
router.put('/:id', requireRoleOrScope(['TECHNICIAN', 'MANAGER'], 'spare_parts'), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { error, value } = createSparePartSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const {
      name,
      partNumber,
      oemPartNumber,
      category,
      make,
      model,
      generation,
      yearStart,
      yearEnd,
      variant,
      fuelType,
      partType,
      brand,
      compatibilityNotes,
      makeId,
      modelId,
      price,
      cost,
      stock,
      minStock,
      unit,
      unitType,
      supplier,
      description
    } = value;

    // Check if spare part exists
    const existingPart = await query('SELECT id FROM spare_parts WHERE id = $1', [id]);
    if (existingPart.rows.length === 0) {
      return res.status(404).json({ message: 'Spare part not found' });
    }

    // Check duplicate part number
    if (partNumber && partNumber.trim() !== '') {
      const existingPartNumber = await query(
        'SELECT id FROM spare_parts WHERE part_number = $1 AND id != $2 AND is_active = true',
        [partNumber.trim(), id]
      );
      
      if (existingPartNumber.rows.length > 0) {
        return res.status(400).json({ message: 'Another spare part with this part number already exists' });
      }
    }

    // Update spare part
    const result = await query(`
      UPDATE spare_parts SET
        name = $1,
        part_number = $2,
        oem_part_number = $3,
        category = $4,
        make = $5,
        model = $6,
        generation = $7,
        year_start = $8,
        year_end = $9,
        variant = $10,
        fuel_type = $11,
        part_type = $12,
        brand = $13,
        compatibility_notes = $14,
        make_id = $15,
        model_id = $16,
        price = $17,
        cost = $18,
        stock_quantity = $19,
        min_stock_level = $20,
        unit = $21,
        unit_type = $22,
        supplier = $23,
        description = $24,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $25
      RETURNING *
    `, [
      name.trim(),
      partNumber ? partNumber.trim() : null,
      oemPartNumber ? oemPartNumber.trim() : null,
      category,
      make || 'Universal',
      model || 'All Models',
      generation || 'All Generations',
      (yearStart && !isNaN(parseInt(yearStart, 10))) ? parseInt(yearStart, 10) : null,
      (yearEnd && !isNaN(parseInt(yearEnd, 10))) ? parseInt(yearEnd, 10) : null,
      variant || 'All Variants',
      fuelType || 'All',
      partType || 'OEM Genuine',
      brand || 'OEM',
      compatibilityNotes || null,
      makeId || null,
      modelId || null,
      price,
      cost,
      stock || 0,
      minStock !== undefined ? minStock : 5,
      unit || 'pieces',
      unitType || 'discrete',
      supplier || null,
      description || null,
      id
    ]);

    res.json({ sparePart: mapSparePart(result.rows[0]) });
  } catch (error) {
    console.error('Update spare part error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Update stock
router.patch('/:id/stock', requireRoleOrScope(['TECHNICIAN', 'MANAGER'], 'spare_parts'), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { quantity, operation } = req.body;

    if (!['add', 'subtract', 'set'].includes(operation)) {
      return res.status(400).json({ message: 'Invalid operation. Use add, subtract, or set' });
    }

    const currentResult = await query('SELECT stock_quantity FROM spare_parts WHERE id = $1', [id]);
    if (currentResult.rows.length === 0) {
      return res.status(404).json({ message: 'Spare part not found' });
    }

    const currentStock = parseFloat(currentResult.rows[0].stock_quantity || 0);
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

    const result = await query(
      'UPDATE spare_parts SET stock_quantity = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      [newStock, id]
    );

    res.json({ sparePart: mapSparePart(result.rows[0]) });
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
    
    res.json({ lowStockItems: result.rows.map(mapSparePart) });
  } catch (error) {
    console.error('Get low stock items error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Delete spare part
router.delete('/:id', requireRoleOrScope(['MANAGER'], 'spare_parts'), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const existingResult = await query('SELECT id, name FROM spare_parts WHERE id = $1', [id]);
    if (existingResult.rows.length === 0) {
      return res.status(404).json({ message: 'Spare part not found' });
    }

    try {
      // Attempt hard delete first
      await query('DELETE FROM spare_parts WHERE id = $1', [id]);
      res.json({ message: 'Spare part deleted successfully' });
    } catch (fkError: any) {
      // If referenced in bills or job cards, perform soft delete to maintain referential integrity
      await query(
        'UPDATE spare_parts SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
        [id]
      );
      res.json({ message: 'Spare part archived successfully (referenced in existing records)' });
    }
  } catch (error: any) {
    console.error('Delete spare part error:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
});

export default router;

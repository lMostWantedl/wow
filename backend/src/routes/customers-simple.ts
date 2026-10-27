import express from 'express';
import { query } from '../database/connection';
import { AuthRequest, requireRole, requireRoleOrScope } from '../middleware/auth';
import Joi from 'joi';

const router = express.Router();

// Validation schemas
const createCustomerSchema = Joi.object({
  name: Joi.string().required(),
  phone: Joi.string().required(),
  email: Joi.string().email().allow('', null).optional(),
  address: Joi.string().allow('', null).optional(),
  vehicles: Joi.array().items(Joi.object({
    id: Joi.string().uuid().allow('', null).optional(),
    makeId: Joi.string().uuid().allow('', null).optional(),
    modelId: Joi.string().uuid().allow('', null).optional(),
    variantId: Joi.string().uuid().allow('', null).optional(),
    colorId: Joi.string().uuid().allow('', null).optional(),
    makeName: Joi.string().allow('', null).optional(),
    modelName: Joi.string().allow('', null).optional(),
    variantName: Joi.string().allow('', null).optional(),
    variantCode: Joi.string().allow('', null).optional(),
    engineType: Joi.string().allow('', null).optional(),
    engineCapacity: Joi.string().allow('', null).optional(),
    transmission: Joi.string().allow('', null).optional(),
    fuelType: Joi.string().allow('', null).optional(),
    colorName: Joi.string().allow('', null).optional(),
    licensePlate: Joi.string().allow('', null).optional(),
    vin: Joi.string().allow('', null).optional(),
    year: Joi.number().integer().allow(null).optional(),
    isPrimary: Joi.boolean().optional()
  })).optional()
});

const updateCustomerSchema = Joi.object({
  name: Joi.string().required(),
  phone: Joi.string().required(),
  email: Joi.string().email().allow('', null).optional(),
  address: Joi.string().allow('', null).optional(),
  vehicleInfo: Joi.any().optional(),
  vehicles: Joi.array().items(Joi.object({
    id: Joi.string().uuid().allow('', null).optional(),
    makeId: Joi.string().uuid().allow('', null).optional(),
    modelId: Joi.string().uuid().allow('', null).optional(),
    variantId: Joi.string().uuid().allow('', null).optional(),
    colorId: Joi.string().uuid().allow('', null).optional(),
    makeName: Joi.string().allow('', null).optional(),
    modelName: Joi.string().allow('', null).optional(),
    variantName: Joi.string().allow('', null).optional(),
    variantCode: Joi.string().allow('', null).optional(),
    engineType: Joi.string().allow('', null).optional(),
    engineCapacity: Joi.string().allow('', null).optional(),
    transmission: Joi.string().allow('', null).optional(),
    fuelType: Joi.string().allow('', null).optional(),
    colorName: Joi.string().allow('', null).optional(),
    licensePlate: Joi.string().allow('', null).optional(),
    vin: Joi.string().allow('', null).optional(),
    year: Joi.number().integer().allow(null).optional(),
    isPrimary: Joi.boolean().optional()
  })).optional()
});

// Helper function to resolve or create make, model, variant, and color if names were manually provided
const resolveVehicleReferences = async (vehicle: any) => {
  let makeId = vehicle.makeId || null;
  let modelId = vehicle.modelId || null;
  let variantId = vehicle.variantId || null;
  let colorId = vehicle.colorId || null;

  if (!makeId && vehicle.makeName && vehicle.makeName.trim()) {
    const trimmedMake = vehicle.makeName.trim();
    const existing = await query('SELECT id FROM vehicle_makes WHERE LOWER(name) = LOWER($1)', [trimmedMake]);
    if (existing.rows.length > 0) {
      makeId = existing.rows[0].id;
    } else {
      const created = await query('INSERT INTO vehicle_makes (name) VALUES ($1) RETURNING id', [trimmedMake]);
      makeId = created.rows[0].id;
    }
  }

  if (makeId && !modelId && vehicle.modelName && vehicle.modelName.trim()) {
    const trimmedModel = vehicle.modelName.trim();
    const existing = await query('SELECT id FROM vehicle_models WHERE make_id = $1 AND LOWER(name) = LOWER($2)', [makeId, trimmedModel]);
    if (existing.rows.length > 0) {
      modelId = existing.rows[0].id;
    } else {
      const created = await query('INSERT INTO vehicle_models (make_id, name) VALUES ($1, $2) RETURNING id', [makeId, trimmedModel]);
      modelId = created.rows[0].id;
    }
  }

  if (modelId && !variantId && vehicle.variantName && vehicle.variantName.trim()) {
    const trimmedVariant = vehicle.variantName.trim();
    const existing = await query('SELECT id FROM vehicle_variants WHERE model_id = $1 AND LOWER(name) = LOWER($2)', [modelId, trimmedVariant]);
    if (existing.rows.length > 0) {
      variantId = existing.rows[0].id;
    } else {
      const created = await query(
        `INSERT INTO vehicle_variants (model_id, name, variant_code, engine_type, engine_capacity, transmission, fuel_type)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
        [
          modelId,
          trimmedVariant,
          vehicle.variantCode || null,
          vehicle.engineType || null,
          vehicle.engineCapacity || null,
          vehicle.transmission || null,
          vehicle.fuelType || null
        ]
      );
      variantId = created.rows[0].id;
    }
  }

  if (variantId && !colorId && vehicle.colorName && vehicle.colorName.trim()) {
    const trimmedColor = vehicle.colorName.trim();
    const existing = await query('SELECT id FROM vehicle_colors WHERE variant_id = $1 AND LOWER(name) = LOWER($2)', [variantId, trimmedColor]);
    if (existing.rows.length > 0) {
      colorId = existing.rows[0].id;
    } else {
      const created = await query('INSERT INTO vehicle_colors (variant_id, name) VALUES ($1, $2) RETURNING id', [variantId, trimmedColor]);
      colorId = created.rows[0].id;
    }
  }

  return { makeId, modelId, variantId, colorId };
};

// Get all customers with search and pagination
router.get('/', async (req: AuthRequest, res) => {
  try {
    // Ensure all users with role 'CUSTOMER' are automatically synchronized into customers table
    try {
      await query(`
        INSERT INTO customers (name, phone, email, user_id)
        SELECT u.name, u.phone, u.email, u.id
        FROM users u
        WHERE u.role = 'CUSTOMER'
          AND NOT EXISTS (SELECT 1 FROM customers c WHERE c.phone = u.phone);

        UPDATE customers c
        SET user_id = u.id
        FROM users u
        WHERE c.phone = u.phone AND (c.user_id IS NULL OR c.user_id != u.id);
      `);
    } catch (syncErr) {
      console.warn('Customer auto-sync note:', syncErr);
    }

    const search = (req.query.search as string || '').trim();
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.max(1, parseInt(req.query.limit as string) || 10);
    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const queryParams: any[] = [];

    // Row-Level Security (RLS):
    // Customers can ONLY see their own customer row
    if (req.user?.role === 'CUSTOMER') {
      queryParams.push(req.user.id);
      queryParams.push(req.user.phone);
      conditions.push(`(c.user_id = $${queryParams.length - 1} OR c.phone = $${queryParams.length})`);
    }

    if (search) {
      queryParams.push(`%${search}%`);
      const searchParamIdx = queryParams.length;
      conditions.push(`(c.name ILIKE $${searchParamIdx} OR c.phone ILIKE $${searchParamIdx} OR c.email ILIKE $${searchParamIdx})`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Get total count matching search and RLS
    const countResult = await query(`
      SELECT COUNT(DISTINCT c.id) as total
      FROM customers c
      ${whereClause}
    `, queryParams);

    const total = parseInt(countResult.rows[0]?.total || '0', 10);

    // Apply pagination if limit is specified
    const fetchParams = [...queryParams];
    let paginationClause = '';
    if (req.query.limit || req.query.page) {
      fetchParams.push(limit);
      fetchParams.push(offset);
      paginationClause = `LIMIT $${fetchParams.length - 1} OFFSET $${fetchParams.length}`;
    }

    const result = await query(`
      SELECT 
        c.id, 
        c.name, 
        c.phone, 
        c.email, 
        c.address, 
        c.created_at as "createdAt",
        c.updated_at as "updatedAt",
        COALESCE(
          json_agg(
            json_build_object(
              'id', cv.id,
              'makeId', cv.make_id,
              'modelId', cv.model_id,
              'variantId', cv.variant_id,
              'colorId', cv.color_id,
              'licensePlate', cv.license_plate,
              'vin', cv.vin,
              'year', cv.year,
              'isPrimary', cv.is_primary,
              'makeName', vm.name,
              'modelName', vmo.name,
              'variantName', vv.name,
              'colorName', vc.name
            ) ORDER BY cv.is_primary DESC, cv.created_at ASC
          ) FILTER (WHERE cv.id IS NOT NULL),
          '[]'::json
        ) as vehicles,
        COALESCE(bill_count.count, 0) as bill_count
      FROM customers c
      LEFT JOIN customer_vehicles cv ON c.id = cv.customer_id AND cv.is_active = true
      LEFT JOIN vehicle_makes vm ON cv.make_id = vm.id
      LEFT JOIN vehicle_models vmo ON cv.model_id = vmo.id
      LEFT JOIN vehicle_variants vv ON cv.variant_id = vv.id
      LEFT JOIN vehicle_colors vc ON cv.color_id = vc.id
      LEFT JOIN (
        SELECT customer_id, COUNT(*) as count 
        FROM bills 
        GROUP BY customer_id
      ) bill_count ON c.id = bill_count.customer_id
      ${whereClause}
      GROUP BY c.id, c.name, c.phone, c.email, c.address, c.created_at, c.updated_at, bill_count.count
      ORDER BY c.created_at DESC
      ${paginationClause}
    `, fetchParams);
    
    res.json({ 
      customers: result.rows,
      pagination: {
        page,
        limit,
        total,
        pages: Math.max(1, Math.ceil(total / limit))
      }
    });
  } catch (error) {
    console.error('Get customers error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get customer by ID
router.get('/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    // Row-Level Security (RLS): Customers can only view their own profile
    if (req.user?.role === 'CUSTOMER') {
      const ownCustomer = await query(
        'SELECT id FROM customers WHERE id = $1 AND (user_id = $2 OR phone = $3)',
        [id, req.user.id, req.user.phone]
      );
      if (ownCustomer.rows.length === 0) {
        return res.status(403).json({ message: 'Access denied: You can only view your own customer details' });
      }
    }
    
    const result = await query(`
      SELECT 
        c.id, 
        c.name, 
        c.phone, 
        c.email, 
        c.address, 
        c.created_at as "createdAt",
        c.updated_at as "updatedAt",
        COALESCE(
          json_agg(
            json_build_object(
              'id', cv.id,
              'makeId', cv.make_id,
              'modelId', cv.model_id,
              'variantId', cv.variant_id,
              'colorId', cv.color_id,
              'licensePlate', cv.license_plate,
              'vin', cv.vin,
              'year', cv.year,
              'isPrimary', cv.is_primary,
              'makeName', vm.name,
              'modelName', vmo.name,
              'variantName', vv.name,
              'colorName', vc.name
            ) ORDER BY cv.is_primary DESC, cv.created_at ASC
          ) FILTER (WHERE cv.id IS NOT NULL),
          '[]'::json
        ) as vehicles,
        COALESCE(bill_count.count, 0) as bill_count
      FROM customers c
      LEFT JOIN customer_vehicles cv ON c.id = cv.customer_id AND cv.is_active = true
      LEFT JOIN vehicle_makes vm ON cv.make_id = vm.id
      LEFT JOIN vehicle_models vmo ON cv.model_id = vmo.id
      LEFT JOIN vehicle_variants vv ON cv.variant_id = vv.id
      LEFT JOIN vehicle_colors vc ON cv.color_id = vc.id
      LEFT JOIN (
        SELECT customer_id, COUNT(*) as count 
        FROM bills 
        GROUP BY customer_id
      ) bill_count ON c.id = bill_count.customer_id
      WHERE c.id = $1
      GROUP BY c.id, c.name, c.phone, c.email, c.address, c.created_at, c.updated_at, bill_count.count
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Customer not found' });
    }
    
    res.json({ customer: result.rows[0] });
  } catch (error) {
    console.error('Get customer error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Helper function to fetch customer with vehicles
const getCustomerWithVehicles = async (customerId: string) => {
  const result = await query(`
    SELECT 
      c.id, 
      c.name, 
      c.phone, 
      c.email, 
      c.address, 
      c.created_at as "createdAt",
      c.updated_at as "updatedAt",
      COALESCE(
        json_agg(
          json_build_object(
            'id', cv.id,
            'makeId', cv.make_id,
            'modelId', cv.model_id,
            'variantId', cv.variant_id,
            'colorId', cv.color_id,
            'licensePlate', cv.license_plate,
            'vin', cv.vin,
            'year', cv.year,
            'isPrimary', cv.is_primary,
            'makeName', vm.name,
            'modelName', vmo.name,
            'variantName', vv.name,
            'colorName', vc.name
          ) ORDER BY cv.is_primary DESC, cv.created_at ASC
        ) FILTER (WHERE cv.id IS NOT NULL),
        '[]'::json
      ) as vehicles
    FROM customers c
    LEFT JOIN customer_vehicles cv ON c.id = cv.customer_id AND cv.is_active = true
    LEFT JOIN vehicle_makes vm ON cv.make_id = vm.id
    LEFT JOIN vehicle_models vmo ON cv.model_id = vmo.id
    LEFT JOIN vehicle_variants vv ON cv.variant_id = vv.id
    LEFT JOIN vehicle_colors vc ON cv.color_id = vc.id
    WHERE c.id = $1
    GROUP BY c.id, c.name, c.phone, c.email, c.address, c.created_at, c.updated_at
  `, [customerId]);
  return result.rows[0];
};

// Create new customer
router.post('/', requireRoleOrScope(['MANAGER', 'TECHNICIAN'], 'customers'), async (req: AuthRequest, res) => {
  try {
    if (req.user?.role === 'CUSTOMER') {
      return res.status(403).json({ message: 'Access denied: Customers cannot create new customer records' });
    }

    const { error, value } = createCustomerSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const { name, phone, email, address, vehicles } = value;

    // Check if customer with phone already exists
    const existingCustomer = await query('SELECT id FROM customers WHERE phone = $1', [phone]);
    if (existingCustomer.rows.length > 0) {
      return res.status(400).json({ message: 'Customer with this phone number already exists' });
    }

    // Create customer
    const customerResult = await query(
      'INSERT INTO customers (name, phone, email, address) VALUES ($1, $2, $3, $4) RETURNING id, name, phone, email, address, created_at',
      [name, phone, email || null, address || null]
    );

    const customer = customerResult.rows[0];

    // Create vehicles if provided
    if (vehicles && vehicles.length > 0) {
      for (const vehicle of vehicles) {
        // Skip completely empty vehicle rows
        if (!vehicle.makeId && !vehicle.modelId && !vehicle.makeName && !vehicle.modelName && !vehicle.licensePlate && !vehicle.vin) {
          continue;
        }

        const resolved = await resolveVehicleReferences(vehicle);

        await query(`
          INSERT INTO customer_vehicles (customer_id, make_id, model_id, variant_id, color_id, license_plate, vin, year, is_primary)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `, [
          customer.id,
          resolved.makeId,
          resolved.modelId,
          resolved.variantId || vehicle.variantId || null,
          resolved.colorId || vehicle.colorId || null,
          vehicle.licensePlate || null,
          vehicle.vin || null,
          vehicle.year || null,
          vehicle.isPrimary || false
        ]);
      }
    }

    const customerWithVehicles = await getCustomerWithVehicles(customer.id);
    res.status(201).json({ customer: customerWithVehicles });
  } catch (error) {
    console.error('Create customer error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Update customer
router.put('/:id', requireRoleOrScope(['MANAGER', 'TECHNICIAN'], 'customers'), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    // Row-Level Security (RLS): Customers can only edit their own customer account
    if (req.user?.role === 'CUSTOMER') {
      const ownCheck = await query(
        'SELECT id FROM customers WHERE id = $1 AND (user_id = $2 OR phone = $3)',
        [id, req.user.id, req.user.phone]
      );
      if (ownCheck.rows.length === 0) {
        return res.status(403).json({ message: 'Access denied: You can only edit your own customer profile' });
      }
    }

    const { error, value } = updateCustomerSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const { name, phone, email, address, vehicles } = value;

    // Check if customer exists
    const existingCustomer = await query('SELECT id FROM customers WHERE id = $1', [id]);
    if (existingCustomer.rows.length === 0) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    // Check if phone number is taken by another customer
    const phoneCheck = await query('SELECT id FROM customers WHERE phone = $1 AND id != $2', [phone, id]);
    if (phoneCheck.rows.length > 0) {
      return res.status(400).json({ message: 'Another customer already has this phone number' });
    }

    // Update customer basic info
    await query(
      'UPDATE customers SET name = $1, phone = $2, email = $3, address = $4, updated_at = CURRENT_TIMESTAMP WHERE id = $5',
      [name, phone, email || null, address || null, id]
    );

    // Synchronize vehicles if provided
    if (vehicles && Array.isArray(vehicles)) {
      const activeVehicleIds: string[] = [];

      for (const vehicle of vehicles) {
        if (!vehicle.makeId && !vehicle.modelId && !vehicle.makeName && !vehicle.modelName && !vehicle.licensePlate && !vehicle.vin) {
          continue;
        }

        const resolved = await resolveVehicleReferences(vehicle);

        if (vehicle.id) {
          // Update existing vehicle
          await query(`
            UPDATE customer_vehicles
            SET make_id = $1, model_id = $2, variant_id = $3, color_id = $4,
                license_plate = $5, vin = $6, year = $7, is_primary = $8, is_active = true, updated_at = CURRENT_TIMESTAMP
            WHERE id = $9 AND customer_id = $10
          `, [
            resolved.makeId,
            resolved.modelId,
            resolved.variantId || vehicle.variantId || null,
            resolved.colorId || vehicle.colorId || null,
            vehicle.licensePlate || null,
            vehicle.vin || null,
            vehicle.year || null,
            vehicle.isPrimary || false,
            vehicle.id,
            id
          ]);
          activeVehicleIds.push(vehicle.id);
        } else {
          // Insert new vehicle
          const insertResult = await query(`
            INSERT INTO customer_vehicles (customer_id, make_id, model_id, variant_id, color_id, license_plate, vin, year, is_primary)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING id
          `, [
            id,
            resolved.makeId,
            resolved.modelId,
            resolved.variantId || vehicle.variantId || null,
            resolved.colorId || vehicle.colorId || null,
            vehicle.licensePlate || null,
            vehicle.vin || null,
            vehicle.year || null,
            vehicle.isPrimary || false
          ]);
          activeVehicleIds.push(insertResult.rows[0].id);
        }
      }

      // Soft delete vehicles that were removed in the edit form
      if (activeVehicleIds.length > 0) {
        await query(`
          UPDATE customer_vehicles 
          SET is_active = false, updated_at = CURRENT_TIMESTAMP
          WHERE customer_id = $1 AND id NOT IN (${activeVehicleIds.map((_, i) => `$${i + 2}`).join(',')})
        `, [id, ...activeVehicleIds]);
      }
    }

    const customerWithVehicles = await getCustomerWithVehicles(id);
    res.json({ customer: customerWithVehicles });
  } catch (error) {
    console.error('Update customer error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Delete customer
router.delete('/:id', requireRoleOrScope(['MANAGER', 'TECHNICIAN'], 'customers'), async (req: AuthRequest, res) => {
  try {
    if (req.user?.role === 'CUSTOMER') {
      return res.status(403).json({ message: 'Access denied: Customers cannot delete customer records' });
    }

    const { id } = req.params;

    // Check if customer exists
    const customerResult = await query('SELECT id, name, phone, user_id FROM customers WHERE id = $1', [id]);
    if (customerResult.rows.length === 0) {
      return res.status(404).json({ message: 'Customer not found' });
    }
    const customer = customerResult.rows[0];

    // 1. Unlink vehicle references in bills belonging to this customer's vehicles
    await query(`
      UPDATE bills 
      SET vehicle_id = NULL 
      WHERE vehicle_id IN (SELECT id FROM customer_vehicles WHERE customer_id = $1)
    `, [id]);

    // 2. Unlink customer reference in bills (preserves bill history without foreign key violation)
    await query('UPDATE bills SET customer_id = NULL WHERE customer_id = $1', [id]);

    // 3. Delete customer vehicles
    await query('DELETE FROM customer_vehicles WHERE customer_id = $1', [id]);

    // 4. Delete customer record
    await query('DELETE FROM customers WHERE id = $1', [id]);

    // 5. Clean up associated user account if it has role 'CUSTOMER'
    // (Prevents customer auto-sync on next query from resurrecting the customer)
    if (customer.user_id) {
      await query('DELETE FROM users WHERE id = $1 AND role = $2', [customer.user_id, 'CUSTOMER']);
    }
    if (customer.phone) {
      await query('DELETE FROM users WHERE phone = $1 AND role = $2', [customer.phone, 'CUSTOMER']);
    }

    res.json({ message: 'Customer deleted successfully' });
  } catch (error) {
    console.error('Delete customer error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get customer vehicles
router.get('/:id/vehicles', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    // Row-Level Security (RLS): Customers can only view their own vehicles
    if (req.user?.role === 'CUSTOMER') {
      const ownCheck = await query(
        'SELECT id FROM customers WHERE id = $1 AND (user_id = $2 OR phone = $3)',
        [id, req.user.id, req.user.phone]
      );
      if (ownCheck.rows.length === 0) {
        return res.status(403).json({ message: 'Access denied: You can only view your own vehicles' });
      }
    }
    
    const result = await query(`
      SELECT 
        cv.id,
        cv.make_id,
        cv.model_id,
        cv.variant_id,
        cv.color_id,
        cv.license_plate,
        cv.vin,
        cv.year,
        cv.is_primary,
        vm.name as make_name,
        vmo.name as model_name,
        vv.name as variant_name,
        vc.name as color_name
      FROM customer_vehicles cv
      LEFT JOIN vehicle_makes vm ON cv.make_id = vm.id
      LEFT JOIN vehicle_models vmo ON cv.model_id = vmo.id
      LEFT JOIN vehicle_variants vv ON cv.variant_id = vv.id
      LEFT JOIN vehicle_colors vc ON cv.color_id = vc.id
      WHERE cv.customer_id = $1 AND cv.is_active = true
      ORDER BY cv.is_primary DESC, cv.created_at ASC
    `, [id]);
    
    res.json({ vehicles: result.rows });
  } catch (error) {
    console.error('Get customer vehicles error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Add vehicle to customer
router.post('/:id/vehicles', requireRoleOrScope(['MANAGER', 'TECHNICIAN'], 'customers'), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    // Row-Level Security (RLS): Customers can only add vehicles to their own profile
    if (req.user?.role === 'CUSTOMER') {
      const ownCheck = await query(
        'SELECT id FROM customers WHERE id = $1 AND (user_id = $2 OR phone = $3)',
        [id, req.user.id, req.user.phone]
      );
      if (ownCheck.rows.length === 0) {
        return res.status(403).json({ message: 'Access denied: You can only manage your own vehicles' });
      }
    }

    const { makeId, modelId, variantId, colorId, licensePlate, vin, year, isPrimary } = req.body;

    // Check if customer exists
    const customer = await query('SELECT id FROM customers WHERE id = $1', [id]);
    if (customer.rows.length === 0) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    // If this is set as primary, unset other primary vehicles
    if (isPrimary) {
      await query('UPDATE customer_vehicles SET is_primary = false WHERE customer_id = $1', [id]);
    }

    // Create vehicle
    const result = await query(`
      INSERT INTO customer_vehicles (customer_id, make_id, model_id, variant_id, color_id, license_plate, vin, year, is_primary)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id, customer_id, make_id, model_id, variant_id, color_id, license_plate, vin, year, is_primary, created_at
    `, [id, makeId || null, modelId || null, variantId || null, colorId || null, licensePlate || null, vin || null, year || null, isPrimary || false]);

    res.status(201).json({ vehicle: result.rows[0] });
  } catch (error) {
    console.error('Add customer vehicle error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Update customer vehicle
router.put('/:id/vehicles/:vehicleId', requireRoleOrScope(['MANAGER', 'TECHNICIAN'], 'customers'), async (req: AuthRequest, res) => {
  try {
    const { id, vehicleId } = req.params;

    // Row-Level Security (RLS): Customers can only edit vehicles on their own profile
    if (req.user?.role === 'CUSTOMER') {
      const ownCheck = await query(
        'SELECT id FROM customers WHERE id = $1 AND (user_id = $2 OR phone = $3)',
        [id, req.user.id, req.user.phone]
      );
      if (ownCheck.rows.length === 0) {
        return res.status(403).json({ message: 'Access denied: You can only manage your own vehicles' });
      }
    }

    const { makeId, modelId, variantId, colorId, licensePlate, vin, year, isPrimary } = req.body;

    // If this is set as primary, unset other primary vehicles
    if (isPrimary) {
      await query('UPDATE customer_vehicles SET is_primary = false WHERE customer_id = $1 AND id != $2', [id, vehicleId]);
    }

    // Update vehicle
    const result = await query(`
      UPDATE customer_vehicles 
      SET make_id = $1, model_id = $2, variant_id = $3, color_id = $4, license_plate = $5, vin = $6, year = $7, is_primary = $8, updated_at = CURRENT_TIMESTAMP
      WHERE id = $9 AND customer_id = $10
      RETURNING id, customer_id, make_id, model_id, variant_id, color_id, license_plate, vin, year, is_primary, updated_at
    `, [makeId || null, modelId || null, variantId || null, colorId || null, licensePlate || null, vin || null, year || null, isPrimary || false, vehicleId, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Vehicle not found' });
    }

    res.json({ vehicle: result.rows[0] });
  } catch (error) {
    console.error('Update customer vehicle error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Delete customer vehicle
router.delete('/:id/vehicles/:vehicleId', requireRoleOrScope(['MANAGER', 'TECHNICIAN'], 'customers'), async (req: AuthRequest, res) => {
  try {
    const { id, vehicleId } = req.params;

    // Row-Level Security (RLS): Customers can only delete vehicles from their own profile
    if (req.user?.role === 'CUSTOMER') {
      const ownCheck = await query(
        'SELECT id FROM customers WHERE id = $1 AND (user_id = $2 OR phone = $3)',
        [id, req.user.id, req.user.phone]
      );
      if (ownCheck.rows.length === 0) {
        return res.status(403).json({ message: 'Access denied: You can only manage your own vehicles' });
      }
    }

    const result = await query(`
      UPDATE customer_vehicles 
      SET is_active = false, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND customer_id = $2
      RETURNING id
    `, [vehicleId, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Vehicle not found' });
    }

    res.json({ message: 'Vehicle deleted successfully' });
  } catch (error) {
    console.error('Delete customer vehicle error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;

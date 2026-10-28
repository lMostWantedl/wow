import express from 'express';
import bcrypt from 'bcryptjs';
import Joi from 'joi';
import { query } from '../database/connection';
import { AuthRequest, requireRole, requireRoleOrScope } from '../middleware/auth';

const router = express.Router();

// Validation schemas
const createUserSchema = Joi.object({
  name: Joi.string().trim().required(),
  phone: Joi.string().trim().required(),
  email: Joi.string().email().trim().allow('', null).optional(),
  password: Joi.string().min(6).required(),
  role: Joi.string().valid('CUSTOMER', 'TECHNICIAN', 'MANAGER').required(),
  scopes: Joi.array().items(Joi.string()).optional(),
  isActive: Joi.boolean().optional(),
  is_active: Joi.boolean().optional(),
  baseSalary: Joi.number().min(0).allow(null).optional(),
  base_salary: Joi.number().min(0).allow(null).optional()
});

const updateUserSchema = Joi.object({
  name: Joi.string().trim().required(),
  phone: Joi.string().trim().required(),
  email: Joi.string().email().trim().allow('', null).optional(),
  password: Joi.string().min(6).allow('', null).optional(),
  role: Joi.string().valid('CUSTOMER', 'TECHNICIAN', 'MANAGER').required(),
  scopes: Joi.array().items(Joi.string()).optional(),
  isActive: Joi.boolean().optional(),
  is_active: Joi.boolean().optional(),
  baseSalary: Joi.number().min(0).allow(null).optional(),
  base_salary: Joi.number().min(0).allow(null).optional()
});

// Helper to format user row
const formatUserRow = (row: any) => {
  if (!row) return null;
  let scopes: string[] = [];
  if (Array.isArray(row.scopes)) {
    scopes = row.scopes;
  } else if (typeof row.scopes === 'string') {
    try {
      scopes = JSON.parse(row.scopes);
    } catch {
      scopes = [];
    }
  } else if (row.role === 'MANAGER') {
    scopes = ['dashboard', 'job_cards', 'bills', 'customers', 'spare_parts', 'services', 'financial', 'users'];
  } else if (row.role === 'TECHNICIAN') {
    scopes = ['dashboard', 'job_cards', 'bills', 'customers', 'spare_parts', 'services'];
  } else if (row.role === 'CUSTOMER') {
    scopes = ['bills'];
  }

  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    email: row.email,
    role: row.role,
    scopes,
    baseSalary: parseFloat(row.baseSalary || row.base_salary || '0'),
    base_salary: parseFloat(row.baseSalary || row.base_salary || '0'),
    isActive: row.isActive !== undefined ? Boolean(row.isActive) : Boolean(row.is_active),
    is_active: row.isActive !== undefined ? Boolean(row.isActive) : Boolean(row.is_active),
    createdAt: row.createdAt || row.created_at,
    updatedAt: row.updatedAt || row.updated_at
  };
};

// Get all users with search, role filter, and pagination (Manager only)
router.get('/', requireRoleOrScope(['MANAGER'], 'users'), async (req: AuthRequest, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit as string) || 10));
    const offset = (page - 1) * limit;
    const search = (req.query.search as string || '').trim();
    const role = (req.query.role as string || '').trim();

    const whereConditions: string[] = [];
    const queryParams: any[] = [];
    let paramIndex = 1;

    if (search) {
      whereConditions.push(`(name ILIKE $${paramIndex} OR phone ILIKE $${paramIndex} OR email ILIKE $${paramIndex})`);
      queryParams.push(`%${search}%`);
      paramIndex++;
    }

    if (role && ['CUSTOMER', 'TECHNICIAN', 'MANAGER'].includes(role)) {
      whereConditions.push(`role = $${paramIndex}`);
      queryParams.push(role);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Count query
    const countResult = await query(
      `SELECT COUNT(*) as total FROM users ${whereClause}`,
      queryParams
    );
    const total = parseInt(countResult.rows[0].total) || 0;
    const pages = Math.max(1, Math.ceil(total / limit));

    // Data query
    const dataParams = [...queryParams, limit, offset];
    const dataQuery = `
      SELECT 
        id, 
        name, 
        phone, 
        email, 
        role, 
        scopes,
        COALESCE(base_salary, 0) as "baseSalary",
        COALESCE(base_salary, 0) as base_salary,
        is_active as "isActive", 
        created_at as "createdAt", 
        updated_at as "updatedAt" 
      FROM users 
      ${whereClause} 
      ORDER BY created_at DESC 
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    const result = await query(dataQuery, dataParams);

    res.json({
      users: result.rows.map(formatUserRow),
      pagination: {
        page,
        limit,
        total,
        pages
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get technicians (Active technicians only)
router.get('/technicians', async (req: AuthRequest, res) => {
  try {
    const result = await query(
      `SELECT 
        id, 
        name, 
        phone, 
        email, 
        role, 
        scopes,
        is_active as "isActive", 
        created_at as "createdAt" 
      FROM users 
      WHERE role = $1 AND is_active = true 
      ORDER BY name`,
      ['TECHNICIAN']
    );
    
    res.json({ technicians: result.rows.map(formatUserRow) });
  } catch (error) {
    console.error('Get technicians error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get user by ID (Manager only)
router.get('/:id', requireRoleOrScope(['MANAGER'], 'users'), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    
    const result = await query(
      `SELECT 
        id, 
        name, 
        phone, 
        email, 
        role, 
        scopes,
        COALESCE(base_salary, 0) as "baseSalary",
        COALESCE(base_salary, 0) as base_salary,
        is_active as "isActive", 
        created_at as "createdAt", 
        updated_at as "updatedAt" 
      FROM users 
      WHERE id = $1`,
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json({ user: formatUserRow(result.rows[0]) });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Create new user (Manager only)
router.post('/', requireRoleOrScope(['MANAGER'], 'users'), async (req: AuthRequest, res) => {
  try {
    const { error, value } = createUserSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const { name, phone, password, role } = value;
    const email = value.email ? value.email.trim() : null;
    const isActive = value.isActive !== undefined ? value.isActive : (value.is_active !== undefined ? value.is_active : true);

    // Default scopes based on role if not explicitly provided
    let scopes = value.scopes;
    if (!scopes || !Array.isArray(scopes)) {
      if (role === 'MANAGER') {
        scopes = ['dashboard', 'job_cards', 'bills', 'customers', 'spare_parts', 'services', 'financial', 'users'];
      } else if (role === 'TECHNICIAN') {
        scopes = ['dashboard', 'job_cards', 'bills', 'customers', 'spare_parts', 'services'];
      } else {
        scopes = ['bills'];
      }
    }

    // Check if user already exists by phone
    const existingPhone = await query('SELECT id FROM users WHERE phone = $1', [phone]);
    if (existingPhone.rows.length > 0) {
      return res.status(400).json({ message: 'A user with this phone number already exists' });
    }

    // Check if user already exists by email if email is provided
    if (email) {
      const existingEmail = await query('SELECT id FROM users WHERE email = $1', [email]);
      if (existingEmail.rows.length > 0) {
        return res.status(400).json({ message: 'A user with this email address already exists' });
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    const baseSalary = value.baseSalary !== undefined ? value.baseSalary : (value.base_salary !== undefined ? value.base_salary : 0);

    // Create user
    const result = await query(
      `INSERT INTO users (name, phone, email, password, role, is_active, scopes, base_salary) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
       RETURNING id, name, phone, email, role, scopes, base_salary, is_active as "isActive", created_at as "createdAt", updated_at as "updatedAt"`,
      [name, phone, email, hashedPassword, role, isActive, JSON.stringify(scopes), baseSalary]
    );

    const newUser = result.rows[0];

    // If role is CUSTOMER, automatically sync into the customers table
    if (role === 'CUSTOMER') {
      const existingCust = await query('SELECT id FROM customers WHERE phone = $1', [phone]);
      if (existingCust.rows.length === 0) {
        await query(
          'INSERT INTO customers (name, phone, email, user_id) VALUES ($1, $2, $3, $4)',
          [name, phone, email, newUser.id]
        );
      } else {
        await query(
          'UPDATE customers SET user_id = $1, name = $2, email = COALESCE($3, email) WHERE id = $4',
          [newUser.id, name, email, existingCust.rows[0].id]
        );
      }
    }

    res.status(201).json({ 
      user: formatUserRow(newUser),
      message: 'User created successfully'
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Update user (Manager only)
router.put('/:id', requireRoleOrScope(['MANAGER'], 'users'), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { error, value } = updateUserSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const { name, phone, role, password, scopes } = value;
    const email = value.email ? value.email.trim() : null;
    const isActive = value.isActive !== undefined ? value.isActive : value.is_active;

    // Check if user exists
    const existingUser = await query('SELECT id, role, scopes, is_active FROM users WHERE id = $1', [id]);
    if (existingUser.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Prevent manager from deactivating themselves
    if (req.user?.id === id && isActive === false) {
      return res.status(400).json({ message: 'You cannot deactivate your own account' });
    }

    // Prevent manager from demoting their own role
    if (req.user?.id === id && role !== 'MANAGER') {
      return res.status(400).json({ message: 'You cannot remove your own MANAGER role' });
    }

    // If manager is editing their own scopes, ensure 'users' scope is retained to avoid accidental lockout
    let finalScopes = scopes;
    if (req.user?.id === id && Array.isArray(finalScopes) && !finalScopes.includes('users')) {
      finalScopes.push('users');
    }

    // Check for duplicate phone
    const existingPhone = await query('SELECT id FROM users WHERE phone = $1 AND id != $2', [phone, id]);
    if (existingPhone.rows.length > 0) {
      return res.status(400).json({ message: 'Another user with this phone number already exists' });
    }

    // Check for duplicate email
    if (email) {
      const existingEmail = await query('SELECT id FROM users WHERE email = $1 AND id != $2', [email, id]);
      if (existingEmail.rows.length > 0) {
        return res.status(400).json({ message: 'Another user with this email address already exists' });
      }
    }

    const finalIsActive = isActive !== undefined ? isActive : existingUser.rows[0].is_active;
    const scopesJson = finalScopes !== undefined ? JSON.stringify(finalScopes) : (existingUser.rows[0].scopes || '[]');
    const finalBaseSalary = value.baseSalary !== undefined 
      ? value.baseSalary 
      : (value.base_salary !== undefined ? value.base_salary : (existingUser.rows[0].base_salary || 0));

    let updateQuery: string;
    let updateParams: any[];

    if (password && password.trim().length >= 6) {
      const hashedPassword = await bcrypt.hash(password.trim(), 12);
      updateQuery = `
        UPDATE users 
        SET name = $1, phone = $2, email = $3, role = $4, is_active = $5, scopes = $6, password = $7, base_salary = $8, updated_at = CURRENT_TIMESTAMP 
        WHERE id = $9 
        RETURNING id, name, phone, email, role, scopes, base_salary, is_active as "isActive", created_at as "createdAt", updated_at as "updatedAt"
      `;
      updateParams = [name, phone, email, role, finalIsActive, scopesJson, hashedPassword, finalBaseSalary, id];
    } else {
      updateQuery = `
        UPDATE users 
        SET name = $1, phone = $2, email = $3, role = $4, is_active = $5, scopes = $6, base_salary = $7, updated_at = CURRENT_TIMESTAMP 
        WHERE id = $8 
        RETURNING id, name, phone, email, role, scopes, base_salary, is_active as "isActive", created_at as "createdAt", updated_at as "updatedAt"
      `;
      updateParams = [name, phone, email, role, finalIsActive, scopesJson, finalBaseSalary, id];
    }

    const result = await query(updateQuery, updateParams);
    const updatedUser = result.rows[0];

    // If role is CUSTOMER, synchronize with customers table
    if (role === 'CUSTOMER') {
      const existingCust = await query('SELECT id FROM customers WHERE user_id = $1 OR phone = $2', [id, phone]);
      if (existingCust.rows.length === 0) {
        await query(
          'INSERT INTO customers (name, phone, email, user_id) VALUES ($1, $2, $3, $4)',
          [name, phone, email, id]
        );
      } else {
        await query(
          'UPDATE customers SET name = $1, phone = $2, email = $3, user_id = $4, updated_at = CURRENT_TIMESTAMP WHERE id = $5',
          [name, phone, email, id, existingCust.rows[0].id]
        );
      }
    }

    res.json({ 
      user: formatUserRow(updatedUser),
      message: 'User updated successfully'
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Activate user (Manager only)
router.patch('/:id/activate', requireRoleOrScope(['MANAGER'], 'users'), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const existingUser = await query('SELECT id FROM users WHERE id = $1', [id]);
    if (existingUser.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const result = await query(
      `UPDATE users 
       SET is_active = true, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $1 
       RETURNING id, name, phone, email, role, scopes, is_active as "isActive", created_at as "createdAt", updated_at as "updatedAt"`,
      [id]
    );

    res.json({ 
      user: formatUserRow(result.rows[0]),
      message: 'User activated successfully'
    });
  } catch (error) {
    console.error('Activate user error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Deactivate user (Manager only)
router.patch('/:id/deactivate', requireRoleOrScope(['MANAGER'], 'users'), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    if (req.user?.id === id) {
      return res.status(400).json({ message: 'You cannot deactivate your own account' });
    }

    const existingUser = await query('SELECT id FROM users WHERE id = $1', [id]);
    if (existingUser.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const result = await query(
      `UPDATE users 
       SET is_active = false, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $1 
       RETURNING id, name, phone, email, role, scopes, is_active as "isActive", created_at as "createdAt", updated_at as "updatedAt"`,
      [id]
    );

    res.json({ 
      user: formatUserRow(result.rows[0]),
      message: 'User deactivated successfully'
    });
  } catch (error) {
    console.error('Deactivate user error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Toggle status endpoint /:id/status (Manager only)
router.patch('/:id/status', requireRoleOrScope(['MANAGER'], 'users'), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { isActive, is_active } = req.body;
    const targetStatus = isActive !== undefined ? isActive : is_active;

    if (targetStatus === undefined) {
      return res.status(400).json({ message: 'isActive boolean is required' });
    }

    if (req.user?.id === id && !targetStatus) {
      return res.status(400).json({ message: 'You cannot deactivate your own account' });
    }

    const result = await query(
      `UPDATE users 
       SET is_active = $1, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $2 
       RETURNING id, name, phone, email, role, scopes, is_active as "isActive", created_at as "createdAt", updated_at as "updatedAt"`,
      [Boolean(targetStatus), id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ 
      user: formatUserRow(result.rows[0]),
      message: `User ${targetStatus ? 'activated' : 'deactivated'} successfully`
    });
  } catch (error) {
    console.error('Update user status error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Delete user (Manager only)
router.delete('/:id', requireRoleOrScope(['MANAGER'], 'users'), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    if (req.user?.id === id) {
      return res.status(400).json({ message: 'You cannot delete your own account' });
    }

    // Check if user exists
    const existingUser = await query('SELECT id, name FROM users WHERE id = $1', [id]);
    if (existingUser.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Set technician_id to NULL on any existing bills to avoid foreign key issues
    await query('UPDATE bills SET technician_id = NULL WHERE technician_id = $1', [id]);

    // Delete user
    await query('DELETE FROM users WHERE id = $1', [id]);

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;

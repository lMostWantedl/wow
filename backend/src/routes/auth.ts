import express from 'express';
import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import Joi from 'joi';
import { query } from '../database/connection';

const router = express.Router();

// Validation schemas
const loginSchema = Joi.object({
  emailOrPhone: Joi.string().required(),
  password: Joi.string().required()
});

const registerSchema = Joi.object({
  name: Joi.string().required(),
  phone: Joi.string().required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  role: Joi.string().valid('CUSTOMER', 'TECHNICIAN', 'MANAGER').required()
});

// Generate JWT token
const generateToken = (userId: string): string => {
  return jwt.sign({ userId }, process.env.JWT_SECRET!, {
    expiresIn: '7d'
  });
};

// Register new user
router.post('/register', async (req, res) => {
  try {
    const { error, value } = registerSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const { name, phone, email, password, role } = value;

    // Check if user already exists by phone or email
    const existingUserByPhone = await query('SELECT id FROM users WHERE phone = $1', [phone]);
    const existingUserByEmail = await query('SELECT id FROM users WHERE email = $1', [email]);

    if (existingUserByPhone.rows.length > 0) {
      return res.status(400).json({ message: 'User with this phone number already exists' });
    }

    if (existingUserByEmail.rows.length > 0) {
      return res.status(400).json({ message: 'User with this email address already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const userResult = await query(
      'INSERT INTO users (name, phone, email, password, role) VALUES ($1, $2, $3, $4, $5) RETURNING id, name, phone, email, role, created_at',
      [name, phone, email, hashedPassword, role]
    );
    
    const user = userResult.rows[0];

    // If role is CUSTOMER, ensure record in customers table
    if (role === 'CUSTOMER') {
      const existingCust = await query('SELECT id FROM customers WHERE phone = $1', [phone]);
      if (existingCust.rows.length === 0) {
        await query(
          'INSERT INTO customers (name, phone, email, user_id) VALUES ($1, $2, $3, $4)',
          [name, phone, email, user.id]
        );
      } else {
        await query('UPDATE customers SET user_id = $1 WHERE id = $2', [user.id, existingCust.rows[0].id]);
      }
    }

    // Generate token
    const token = generateToken(user.id);

    res.status(201).json({
      message: 'User registered successfully',
      user,
      token
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Login user
router.post('/login', async (req, res) => {
  try {
    const { error, value } = loginSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const { emailOrPhone, password } = value;

    // Determine if input is email or phone
    const isEmail = emailOrPhone.includes('@');
    
    // Find user by email or phone
    const userResult = await query(
      `SELECT id, name, phone, email, password, role, scopes, is_active FROM users WHERE ${isEmail ? 'email' : 'phone'} = $1`,
      [emailOrPhone]
    );

    console.log("userResult", userResult);

    if (userResult.rows.length === 0 || !userResult.rows[0].is_active) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const user = userResult.rows[0];


    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    console.log("isPasswordValid", isPasswordValid);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate token
    const token = generateToken(user.id);

    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        role: user.role,
        scopes: Array.isArray(user.scopes) ? user.scopes : (typeof user.scopes === 'string' ? JSON.parse(user.scopes || '[]') : [])
      },
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get current user profile
router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ message: 'Access token required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    
    const userResult = await query(
      'SELECT id, name, phone, email, role, scopes, is_active as "isActive", created_at as "createdAt" FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const rawUser = userResult.rows[0];
    const user = {
      ...rawUser,
      scopes: Array.isArray(rawUser.scopes) ? rawUser.scopes : (typeof rawUser.scopes === 'string' ? JSON.parse(rawUser.scopes || '[]') : [])
    };

    res.json({ user });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;

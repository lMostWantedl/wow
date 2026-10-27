import express from 'express';
import { query } from '../database/connection';
import { AuthRequest, requireRole } from '../middleware/auth';
import { decodeVinNumber } from '../services/vinDecoder';
import Joi from 'joi';

const router = express.Router();

// Validation schemas
const createMakeSchema = Joi.object({
  name: Joi.string().required(),
  country: Joi.string().allow('', null).optional(),
  logo_url: Joi.string().uri().allow('', null).optional()
});

const createModelSchema = Joi.object({
  make_id: Joi.string().uuid().required(),
  name: Joi.string().required(),
  year_start: Joi.number().integer().allow(null).optional(),
  year_end: Joi.number().integer().allow(null).optional(),
  body_type: Joi.string().allow('', null).optional()
});

const createVariantSchema = Joi.object({
  model_id: Joi.string().uuid().required(),
  name: Joi.string().required(),
  variant_code: Joi.string().allow('', null).optional(),
  engine_type: Joi.string().allow('', null).optional(),
  engine_capacity: Joi.string().allow('', null).optional(),
  transmission: Joi.string().allow('', null).optional(),
  fuel_type: Joi.string().allow('', null).optional(),
  power_bhp: Joi.number().integer().allow(null).optional(),
  torque_nm: Joi.number().integer().allow(null).optional(),
  seating_capacity: Joi.number().integer().allow(null).optional(),
  fuel_tank_capacity: Joi.number().integer().allow(null).optional(),
  ground_clearance: Joi.number().integer().allow(null).optional(),
  boot_space: Joi.number().integer().allow(null).optional(),
  ecm: Joi.string().allow('', null).optional()
});

const createColorSchema = Joi.object({
  variant_id: Joi.string().uuid().required(),
  name: Joi.string().required(),
  color_code: Joi.string().allow('', null).optional(),
  color_type: Joi.string().allow('', null).optional()
});

// Decode VIN / Chassis number
router.get('/vin-decode/:vin', async (req: AuthRequest, res) => {
  try {
    const { vin } = req.params;
    if (!vin || vin.trim().length < 5) {
      return res.status(400).json({ message: 'Valid VIN (at least 5 characters) is required' });
    }

    const decoded = await decodeVinNumber(vin);
    res.json(decoded);
  } catch (error: any) {
    console.error('Decode VIN error:', error);
    res.status(400).json({ message: error.message || 'Failed to decode VIN' });
  }
});

// Get all vehicle makes
router.get('/makes', async (req: AuthRequest, res) => {
  try {
    const result = await query(
      'SELECT id, name, country, logo_url FROM vehicle_makes WHERE is_active = true ORDER BY name'
    );

    res.json({ makes: result.rows });
  } catch (error) {
    console.error('Get vehicle makes error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get models by make
router.get('/makes/:makeId/models', async (req: AuthRequest, res) => {
  try {
    const { makeId } = req.params;

    const result = await query(
      'SELECT id, name, year_start, year_end, body_type FROM vehicle_models WHERE make_id = $1 AND is_active = true ORDER BY name',
      [makeId]
    );

    res.json({ models: result.rows });
  } catch (error) {
    console.error('Get vehicle models error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get variants by model
router.get('/models/:modelId/variants', async (req: AuthRequest, res) => {
  try {
    const { modelId } = req.params;

    const result = await query(
      'SELECT id, name, variant_code, engine_type, engine_capacity, transmission, fuel_type, power_bhp, torque_nm, seating_capacity, fuel_tank_capacity, ground_clearance, boot_space, ecm FROM vehicle_variants WHERE model_id = $1 AND is_active = true ORDER BY name',
      [modelId]
    );

    res.json({ variants: result.rows });
  } catch (error) {
    console.error('Get vehicle variants error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get colors by variant
router.get('/variants/:variantId/colors', async (req: AuthRequest, res) => {
  try {
    const { variantId } = req.params;

    const result = await query(
      'SELECT id, name, color_code, color_type FROM vehicle_colors WHERE variant_id = $1 AND is_active = true ORDER BY name',
      [variantId]
    );

    res.json({ colors: result.rows });
  } catch (error) {
    console.error('Get vehicle colors error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Create vehicle make (Manager / Technician)
router.post('/makes', requireRole(['MANAGER', 'TECHNICIAN']), async (req: AuthRequest, res) => {
  try {
    const { error, value } = createMakeSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const { name, country, logo_url } = value;

    // Check if make already exists
    const existingMake = await query('SELECT id FROM vehicle_makes WHERE LOWER(name) = LOWER($1)', [name]);
    if (existingMake.rows.length > 0) {
      return res.status(400).json({ message: 'Vehicle make already exists' });
    }

    // Create make
    const result = await query(
      'INSERT INTO vehicle_makes (name, country, logo_url) VALUES ($1, $2, $3) RETURNING id, name, country, logo_url, created_at',
      [name, country || null, logo_url || null]
    );

    res.status(201).json({ make: result.rows[0] });
  } catch (error) {
    console.error('Create vehicle make error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Create vehicle model (Manager / Technician)
router.post('/models', requireRole(['MANAGER', 'TECHNICIAN']), async (req: AuthRequest, res) => {
  try {
    const { error, value } = createModelSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const { make_id, name, year_start, year_end, body_type } = value;

    // Check if model already exists for this make
    const existingModel = await query('SELECT id FROM vehicle_models WHERE make_id = $1 AND LOWER(name) = LOWER($2)', [make_id, name]);
    if (existingModel.rows.length > 0) {
      return res.status(400).json({ message: 'Vehicle model already exists for this make' });
    }

    // Create model
    const result = await query(
      'INSERT INTO vehicle_models (make_id, name, year_start, year_end, body_type) VALUES ($1, $2, $3, $4, $5) RETURNING id, make_id, name, year_start, year_end, body_type, created_at',
      [make_id, name, year_start || null, year_end || null, body_type || null]
    );

    res.status(201).json({ model: result.rows[0] });
  } catch (error) {
    console.error('Create vehicle model error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Create vehicle variant (Manager / Technician)
router.post('/variants', requireRole(['MANAGER', 'TECHNICIAN']), async (req: AuthRequest, res) => {
  try {
    const { error, value } = createVariantSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const { model_id, name, variant_code, engine_type, engine_capacity, transmission, fuel_type, power_bhp, torque_nm, seating_capacity, fuel_tank_capacity, ground_clearance, boot_space, ecm } = value;

    // Check if variant already exists for this model
    const existingVariant = await query('SELECT id FROM vehicle_variants WHERE model_id = $1 AND LOWER(name) = LOWER($2)', [model_id, name]);
    if (existingVariant.rows.length > 0) {
      return res.status(400).json({ message: 'Vehicle variant already exists for this model' });
    }

    // Create variant
    const result = await query(
      `INSERT INTO vehicle_variants (
        model_id, name, variant_code, engine_type, engine_capacity, transmission, 
        fuel_type, power_bhp, torque_nm, seating_capacity, fuel_tank_capacity, 
        ground_clearance, boot_space, ecm
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) 
      RETURNING *`,
      [model_id, name, variant_code || null, engine_type || null, engine_capacity || null, transmission || null, fuel_type || null, power_bhp || null, torque_nm || null, seating_capacity || null, fuel_tank_capacity || null, ground_clearance || null, boot_space || null, ecm || null]
    );

    res.status(201).json({ variant: result.rows[0] });
  } catch (error) {
    console.error('Create vehicle variant error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Create vehicle color (Manager / Technician)
router.post('/colors', requireRole(['MANAGER', 'TECHNICIAN']), async (req: AuthRequest, res) => {
  try {
    const { error, value } = createColorSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const { variant_id, name, color_code, color_type } = value;

    // Check if color already exists for this variant
    const existingColor = await query('SELECT id FROM vehicle_colors WHERE variant_id = $1 AND LOWER(name) = LOWER($2)', [variant_id, name]);
    if (existingColor.rows.length > 0) {
      return res.status(400).json({ message: 'Vehicle color already exists for this variant' });
    }

    // Create color
    const result = await query(
      'INSERT INTO vehicle_colors (variant_id, name, color_code, color_type) VALUES ($1, $2, $3, $4) RETURNING id, variant_id, name, color_code, color_type, created_at',
      [variant_id, name, color_code || null, color_type || null]
    );

    res.status(201).json({ color: result.rows[0] });
  } catch (error) {
    console.error('Create vehicle color error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;

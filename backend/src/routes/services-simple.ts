import express from 'express';
import { query } from '../database/connection';
import { AuthRequest, requireRole, requireRoleOrScope } from '../middleware/auth';
import Joi from 'joi';

const router = express.Router();

// Validation schemas
const createServiceSchema = Joi.object({
  name: Joi.string().required(),
  description: Joi.string().allow('', null).optional(),
  category: Joi.string().allow('', null).default('General'),
  serviceType: Joi.string().valid('LABOR', 'EXTERNAL_SERVICE').default('LABOR'),
  service_type: Joi.string().valid('LABOR', 'EXTERNAL_SERVICE').optional(),
  defaultVendor: Joi.string().allow('', null).optional(),
  default_vendor: Joi.string().allow('', null).optional(),
  defaultCost: Joi.number().min(0).default(0),
  default_cost: Joi.number().min(0).optional(),
  price: Joi.number().min(0).required(),
  duration: Joi.number().min(1).default(60)
}).unknown(true);

export const DEFAULT_AUTOMOTIVE_SERVICES = [
  // Periodic & Maintenance
  { name: 'Comprehensive General Service', category: 'Periodic & Maintenance', description: 'Complete vehicle inspection, fluid top-up, filter clean, 40-point safety check', price: 1500, duration: 180 },
  { name: 'Engine Oil & Filter Service', category: 'Periodic & Maintenance', description: 'Engine oil replacement, oil filter change, and sump plug washer inspection', price: 600, duration: 60 },
  { name: '10,000 km Periodic Maintenance', category: 'Periodic & Maintenance', description: 'Scheduled maintenance check, oil & filter change, brake clean, spark check', price: 2000, duration: 180 },
  { name: 'Major Scheduled Service (40,000 km)', category: 'Periodic & Maintenance', description: 'Full mechanical & electrical health check, all fluids flush, plugs, filters', price: 4500, duration: 300 },
  { name: 'Pre-Purchase Vehicle Inspection', category: 'Periodic & Maintenance', description: 'Comprehensive bumper-to-bumper pre-buying inspection report & scan', price: 1200, duration: 90 },

  // Engine & Diagnostics
  { name: 'Engine Diagnostic / OBD-II Scan', category: 'Engine & Diagnostics', description: 'Computerized diagnostic scan, ECU fault code analysis & sensor troubleshooting', price: 800, duration: 45 },
  { name: 'Engine Decarbonization & Throttle Cleaning', category: 'Engine & Diagnostics', description: 'Intake valve decarbonization, throttle body cleaning & idle calibration', price: 1800, duration: 90 },
  { name: 'Spark Plug Replacement & Ignition Check', category: 'Engine & Diagnostics', description: 'Replacement of spark plugs, ignition coil test, and lead check', price: 400, duration: 45 },
  { name: 'Radiator Flush & Coolant Replacement', category: 'Engine & Diagnostics', description: 'Complete cooling system chemical flush, leak test, and fresh coolant refill', price: 900, duration: 60 },
  { name: 'Timing Belt / Timing Chain Replacement', category: 'Engine & Diagnostics', description: 'Timing belt or chain renewal, tensioner pulley adjustment, and cam timing check', price: 3500, duration: 240 },
  { name: 'Water Pump Repair / Replacement', category: 'Engine & Diagnostics', description: 'Coolant water pump inspection and replacement with new gasket', price: 1500, duration: 120 },
  { name: 'Cylinder Head Gasket Replacement', category: 'Engine & Diagnostics', description: 'Head skimming, valve resealing, and new multi-layer steel head gasket fitment', price: 6500, duration: 360 },

  // Brakes & Safety
  { name: 'Brake Service (Front & Rear Pads)', category: 'Brakes & Safety', description: 'Brake pads replacement, caliper pins greasing, and rotor inspection', price: 800, duration: 90 },
  { name: 'Brake Disc / Rotor Skimming', category: 'Brakes & Safety', description: 'Precision lathe facing of warped or scored brake discs to eliminate judder', price: 1200, duration: 120 },
  { name: 'Brake Fluid Flush & Bleeding', category: 'Brakes & Safety', description: 'Complete pneumatic hydraulic brake fluid flush with fresh DOT4 fluid', price: 750, duration: 60 },
  { name: 'Handbrake Cable & Shoe Adjustment', category: 'Brakes & Safety', description: 'Parking brake lever travel calibration, rear drum shoe cleaning & adjustment', price: 450, duration: 45 },
  { name: 'Brake Caliper Overhaul / Replacement', category: 'Brakes & Safety', description: 'Brake caliper piston seal replacement, bleed nipple service, slider pin lube', price: 1100, duration: 90 },
  { name: 'Brake Service', category: 'Brakes & Safety', description: 'General brake system inspection, pad cleaning and adjustments', price: 150, duration: 30 },

  // Suspension & Steering
  { name: '3D Computerized Wheel Alignment', category: 'Suspension & Steering', description: 'Laser 4-wheel computerized toe, camber, and caster angle alignment', price: 600, duration: 45 },
  { name: 'Wheel Balancing & Rotation (4 Wheels)', category: 'Suspension & Steering', description: 'Dynamic computerized wheel balancing with precision weights and tire rotation', price: 500, duration: 45 },
  { name: 'Front Strut / Shock Absorber Replacement', category: 'Suspension & Steering', description: 'Front suspension strut removal, spring compression, mount & buffer fitment', price: 1400, duration: 120 },
  { name: 'Rear Shock Absorber Replacement', category: 'Suspension & Steering', description: 'Rear damper renewal and rubber bush check', price: 800, duration: 60 },
  { name: 'Suspension Bushing & Lower Arm Overhaul', category: 'Suspension & Steering', description: 'Lower control arm, stabilizer bar end links, and subframe bush overhaul', price: 2200, duration: 180 },
  { name: 'Power Steering Rack & Tie-Rod Servicing', category: 'Suspension & Steering', description: 'Steering rack backlash adjustment, tie-rod end and rack boot replacement', price: 1800, duration: 150 },

  // Clutch & Transmission
  { name: 'Clutch Overhaul & Plate Replacement', category: 'Clutch & Transmission', description: 'Gearbox drop, clutch friction disc, pressure plate, and release bearing replacement', price: 3800, duration: 300 },
  { name: 'Manual Gearbox Fluid Service', category: 'Clutch & Transmission', description: 'Transmission oil drain and refill with specified synthetic gear oil', price: 500, duration: 45 },
  { name: 'Automatic Transmission (AT/CVT) Flush', category: 'Clutch & Transmission', description: 'Automatic transmission fluid flush, strainer/filter replacement, and adaptation', price: 2500, duration: 120 },
  { name: 'Drive Shaft & CV Joint Boot Repair', category: 'Clutch & Transmission', description: 'Drive axle removal, constant velocity joint repacking with high-temp grease & new boot', price: 1200, duration: 90 },

  // Air Conditioning & Climate
  { name: 'Car AC Servicing & Gas Recharge', category: 'AC & Climate', description: 'AC vacuum leak check, compressor oil refill, and pure R134a refrigerant charge', price: 2200, duration: 90 },
  { name: 'AC Cooling Coil / Evaporator Cleaning', category: 'AC & Climate', description: 'Dashboard evaporator foam deep cleaning and fungal odor removal', price: 1500, duration: 120 },
  { name: 'AC Compressor Clutch Repair / Replacement', category: 'AC & Climate', description: 'Compressor magnetic clutch coil, bearing, and pulley servicing', price: 2000, duration: 150 },
  { name: 'AC Service', category: 'AC & Climate', description: 'Air conditioning system service and cabin filter check', price: 120, duration: 60 },

  // Electrical & Battery
  { name: 'Car Battery Health Test & Terminal Service', category: 'Electrical & Battery', description: 'Digital battery CCA health test, specific gravity test, and anti-corrosion grease', price: 250, duration: 30 },
  { name: 'Alternator Repair / Overhaul', category: 'Electrical & Battery', description: 'Alternator diode rectifier, voltage regulator, and carbon brush replacement', price: 1600, duration: 120 },
  { name: 'Starter Motor Repair & Servicing', category: 'Electrical & Battery', description: 'Bendix gear, solenoid switch, and armature brush servicing', price: 1400, duration: 90 },
  { name: 'Headlight Restoration & Alignment', category: 'Electrical & Battery', description: 'Headlamp UV haze polish and optical beam level adjustment', price: 700, duration: 60 },

  // Fuel System & Intake
  { name: 'Fuel Injector Ultrasonic Cleaning', category: 'Fuel System & Intake', description: 'Ultrasonic bath injector cleaning, spray pattern testing, and O-ring replacement', price: 1600, duration: 90 },
  { name: 'Fuel Pump Replacement & Tank Cleaning', category: 'Fuel System & Intake', description: 'High-pressure fuel pump assembly installation and fuel tank sedimentation flush', price: 1800, duration: 120 },

  // Detailing, Washing & Body Care
  { name: 'Complete Foam Wash & Interior Vacuum', category: 'Detailing & Body Care', description: 'High-pressure foam exterior wash, underbody rinse, interior vacuuming & dashboard polish', price: 500, duration: 60 },
  { name: 'Deep Interior Foam Spa & Sanitization', category: 'Detailing & Body Care', description: 'Steam upholstery shampoo, roof liner cleaning, carpet deep extraction & AC duct sanitize', price: 1800, duration: 180 },
  { name: 'Exterior Machine Rubbing & Wax Polish', category: 'Detailing & Body Care', description: 'Paint swirl mark removal, compounding, and carnauba wax paint protection', price: 2400, duration: 240 },
  { name: 'Underbody Anti-Rust Rubberized Coating', category: 'Detailing & Body Care', description: 'Complete chassis and wheel well bitumen rubberized anti-corrosion spray (5-yr warranty)', price: 2200, duration: 90 },
  { name: 'Dent Removal & Panel Paint (Per Panel)', category: 'Detailing & Body Care', description: 'Spot dent pulling, primer application, computer color matching, and clear coat baking', price: 2500, duration: 360 }
];

let defaultServicesChecked = false;
async function ensureDefaultServices() {
  if (defaultServicesChecked) return;
  try {
    for (const s of DEFAULT_AUTOMOTIVE_SERVICES) {
      await query(
        `INSERT INTO services (name, description, category, base_price, duration)
         SELECT $1::varchar, $2::text, $3::varchar, $4::numeric, $5::integer
         WHERE NOT EXISTS (SELECT 1 FROM services WHERE LOWER(name) = LOWER($1::varchar))`,
        [s.name, s.description, s.category, s.price, s.duration]
      );
      // Auto-update category if null or generic
      await query(
        `UPDATE services SET category = $1 WHERE LOWER(name) = LOWER($2) AND (category IS NULL OR category = 'General')`,
        [s.category, s.name]
      );
    }
    defaultServicesChecked = true;
  } catch (err) {
    console.warn('Could not auto-seed default services:', err);
  }
}

// Get service categories
router.get('/categories', async (req: AuthRequest, res) => {
  try {
    await ensureDefaultServices();
    const result = await query(
      `SELECT DISTINCT COALESCE(category, 'General') as category FROM services WHERE is_active = true ORDER BY category ASC`
    );
    const categories = result.rows.map(r => r.category);
    res.json({ categories });
  } catch (error) {
    console.error('Get service categories error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get all services with search & category filtering
router.get('/', async (req: AuthRequest, res) => {
  try {
    await ensureDefaultServices();

    const { category, search, page, limit } = req.query;

    let queryText = `SELECT id, name, description, COALESCE(category, 'General') as category,
                            COALESCE(service_type, 'LABOR') as "serviceType",
                            COALESCE(service_type, 'LABOR') as service_type,
                            default_vendor as "defaultVendor",
                            default_vendor,
                            COALESCE(default_cost, 0) as "defaultCost",
                            COALESCE(default_cost, 0) as default_cost,
                            base_price as price, duration, is_active as "isActive", created_at as "createdAt", updated_at as "updatedAt"
                     FROM services WHERE is_active = true`;
    let countQueryText = `SELECT COUNT(*) as total FROM services WHERE is_active = true`;
    let params: any[] = [];
    let countParams: any[] = [];
    let paramCount = 0;

    if (category && category !== 'ALL' && category !== '') {
      paramCount++;
      const catClause = ` AND LOWER(COALESCE(category, 'General')) = LOWER($${paramCount})`;
      queryText += catClause;
      countQueryText += catClause;
      params.push(category);
      countParams.push(category);
    }

    if (search && typeof search === 'string' && search.trim() !== '') {
      paramCount++;
      const searchTerm = `%${search.trim()}%`;
      const searchClause = ` AND (name ILIKE $${paramCount} OR COALESCE(description, '') ILIKE $${paramCount} OR COALESCE(category, '') ILIKE $${paramCount})`;
      queryText += searchClause;
      countQueryText += searchClause;
      params.push(searchTerm);
      countParams.push(searchTerm);
    }

    // Get total matching
    const countResult = await query(countQueryText, countParams);
    const total = parseInt(countResult.rows[0]?.total || '0', 10);

    queryText += ' ORDER BY category ASC, name ASC';

    // Pagination
    const pageNum = page ? parseInt(page as string, 10) : 0;
    const limitNum = limit ? parseInt(limit as string, 10) : 0;

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
      services: result.rows,
      pagination: {
        total,
        page: pageNum || 1,
        limit: limitNum || total,
        pages: limitNum > 0 ? Math.ceil(total / limitNum) : 1
      }
    });
  } catch (error) {
    console.error('Get services error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get service by ID
router.get('/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      `SELECT id, name, description, COALESCE(category, 'General') as category,
              COALESCE(service_type, 'LABOR') as "serviceType",
              COALESCE(service_type, 'LABOR') as service_type,
              default_vendor as "defaultVendor",
              default_vendor,
              COALESCE(default_cost, 0) as "defaultCost",
              COALESCE(default_cost, 0) as default_cost,
              base_price as price, duration, is_active as "isActive", created_at as "createdAt", updated_at as "updatedAt"
       FROM services WHERE id = $1 AND is_active = true`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Service not found' });
    }

    res.json({ service: result.rows[0] });
  } catch (error) {
    console.error('Get service error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Create new service
router.post('/', requireRoleOrScope(['TECHNICIAN', 'MANAGER'], 'services'), async (req: AuthRequest, res) => {
  try {
    const { error, value } = createServiceSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const { name, description, category, price, duration } = value;
    const finalServiceType = value.serviceType || value.service_type || 'LABOR';
    const finalVendor = value.defaultVendor || value.default_vendor || null;
    const finalCost = value.defaultCost ?? value.default_cost ?? 0;

    // Check if service already exists
    const existingService = await query(
      'SELECT id FROM services WHERE LOWER(name) = LOWER($1)',
      [name]
    );

    if (existingService.rows.length > 0) {
      return res.status(400).json({ message: 'Service with this name already exists' });
    }

    // Create service
    const result = await query(
      `INSERT INTO services (name, description, category, service_type, default_vendor, default_cost, base_price, duration)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, name, description, category,
                 COALESCE(service_type, 'LABOR') as "serviceType",
                 COALESCE(service_type, 'LABOR') as service_type,
                 default_vendor as "defaultVendor",
                 default_vendor,
                 COALESCE(default_cost, 0) as "defaultCost",
                 COALESCE(default_cost, 0) as default_cost,
                 base_price as price, duration, is_active as "isActive", created_at as "createdAt", updated_at as "updatedAt"`,
      [name, description || null, category || 'General', finalServiceType, finalVendor, finalCost, price, duration || 60]
    );

    res.status(201).json({ service: result.rows[0] });
  } catch (error) {
    console.error('Create service error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Update service
router.put('/:id', requireRoleOrScope(['TECHNICIAN', 'MANAGER'], 'services'), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { error, value } = createServiceSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const { name, description, category, price, duration } = value;

    // Check if service exists
    const existingService = await query('SELECT * FROM services WHERE id = $1', [id]);
    if (existingService.rows.length === 0) {
      return res.status(404).json({ message: 'Service not found' });
    }

    // Check name collision
    const nameCollision = await query('SELECT id FROM services WHERE LOWER(name) = LOWER($1) AND id != $2', [name, id]);
    if (nameCollision.rows.length > 0) {
      return res.status(400).json({ message: 'Another service with this name already exists' });
    }

    const finalServiceType = value.serviceType || value.service_type || existingService.rows[0].service_type || 'LABOR';
    const finalVendor = value.defaultVendor !== undefined ? value.defaultVendor : (value.default_vendor !== undefined ? value.default_vendor : existingService.rows[0].default_vendor);
    const finalCost = value.defaultCost !== undefined ? value.defaultCost : (value.default_cost !== undefined ? value.default_cost : existingService.rows[0].default_cost);

    // Update service
    const result = await query(
      `UPDATE services 
       SET name = $1, description = $2, category = $3, service_type = $4, default_vendor = $5, default_cost = $6, base_price = $7, duration = $8, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $9 
       RETURNING id, name, description, category,
                 COALESCE(service_type, 'LABOR') as "serviceType",
                 COALESCE(service_type, 'LABOR') as service_type,
                 default_vendor as "defaultVendor",
                 default_vendor,
                 COALESCE(default_cost, 0) as "defaultCost",
                 COALESCE(default_cost, 0) as default_cost,
                 base_price as price, duration, is_active as "isActive", created_at as "createdAt", updated_at as "updatedAt"`,
      [name, description || null, category || 'General', finalServiceType, finalVendor, finalCost, price, duration || 60, id]
    );

    res.json({ service: result.rows[0] });
  } catch (error) {
    console.error('Update service error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Delete service
router.delete('/:id', requireRoleOrScope(['MANAGER'], 'services'), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    // Check if service exists
    const existingService = await query('SELECT id FROM services WHERE id = $1', [id]);
    if (existingService.rows.length === 0) {
      return res.status(404).json({ message: 'Service not found' });
    }

    try {
      // Try hard delete first
      await query('DELETE FROM services WHERE id = $1', [id]);
      res.json({ message: 'Service deleted successfully' });
    } catch (fkErr) {
      // If referenced in bills or job cards, soft delete
      await query('UPDATE services SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1', [id]);
      res.json({ message: 'Service archived successfully' });
    }
  } catch (error) {
    console.error('Delete service error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;

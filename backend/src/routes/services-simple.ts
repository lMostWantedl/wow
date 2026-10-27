import express from 'express';
import { query } from '../database/connection';
import { AuthRequest, requireRole } from '../middleware/auth';
import Joi from 'joi';

const router = express.Router();

// Validation schemas
const createServiceSchema = Joi.object({
  name: Joi.string().required(),
  description: Joi.string().allow('', null).optional(),
  price: Joi.number().min(0).required(),
  duration: Joi.number().min(1).default(60)
});

export const DEFAULT_AUTOMOTIVE_SERVICES = [
  // Periodic & General Service
  { name: 'Comprehensive General Service', description: 'Complete vehicle inspection, fluid top-up, filter clean, 40-point safety check', price: 1500, duration: 180 },
  { name: 'Engine Oil & Filter Service', description: 'Engine oil replacement, oil filter change, and sump plug washer inspection', price: 600, duration: 60 },
  { name: '10,000 km Periodic Maintenance', description: 'Scheduled maintenance check, oil & filter change, brake clean, spark check', price: 2000, duration: 180 },
  { name: 'Major Scheduled Service (40,000 km)', description: 'Full mechanical & electrical health check, all fluids flush, plugs, filters', price: 4500, duration: 300 },
  { name: 'Pre-Purchase Vehicle Inspection', description: 'Comprehensive bumper-to-bumper pre-buying inspection report & scan', price: 1200, duration: 90 },

  // Engine & Performance
  { name: 'Engine Diagnostic / OBD-II Scan', description: 'Computerized diagnostic scan, ECU fault code analysis & sensor troubleshooting', price: 800, duration: 45 },
  { name: 'Engine Decarbonization & Throttle Cleaning', description: 'Intake valve decarbonization, throttle body cleaning & idle calibration', price: 1800, duration: 90 },
  { name: 'Spark Plug Replacement & Ignition Check', description: 'Replacement of spark plugs, ignition coil test, and lead check', price: 400, duration: 45 },
  { name: 'Radiator Flush & Coolant Replacement', description: 'Complete cooling system chemical flush, leak test, and fresh coolant refill', price: 900, duration: 60 },
  { name: 'Timing Belt / Timing Chain Replacement', description: 'Timing belt or chain renewal, tensioner pulley adjustment, and cam timing check', price: 3500, duration: 240 },
  { name: 'Water Pump Repair / Replacement', description: 'Coolant water pump inspection and replacement with new gasket', price: 1500, duration: 120 },
  { name: 'Cylinder Head Gasket Replacement', description: 'Head skimming, valve resealing, and new multi-layer steel head gasket fitment', price: 6500, duration: 360 },

  // Brakes & Safety
  { name: 'Brake Service (Front & Rear Pads)', description: 'Brake pads replacement, caliper pins greasing, and rotor inspection', price: 800, duration: 90 },
  { name: 'Brake Disc / Rotor Skimming', description: 'Precision lathe facing of warped or scored brake discs to eliminate judder', price: 1200, duration: 120 },
  { name: 'Brake Fluid Flush & Bleeding', description: 'Complete pneumatic hydraulic brake fluid flush with fresh DOT4 fluid', price: 750, duration: 60 },
  { name: 'Handbrake Cable & Shoe Adjustment', description: 'Parking brake lever travel calibration, rear drum shoe cleaning & adjustment', price: 450, duration: 45 },
  { name: 'Brake Caliper Overhaul / Replacement', description: 'Brake caliper piston seal replacement, bleed nipple service, slider pin lube', price: 1100, duration: 90 },

  // Suspension & Steering
  { name: '3D Computerized Wheel Alignment', description: 'Laser 4-wheel computerized toe, camber, and caster angle alignment', price: 600, duration: 45 },
  { name: 'Wheel Balancing & Rotation (4 Wheels)', description: 'Dynamic computerized wheel balancing with precision weights and tire rotation', price: 500, duration: 45 },
  { name: 'Front Strut / Shock Absorber Replacement', description: 'Front suspension strut removal, spring compression, mount & buffer fitment', price: 1400, duration: 120 },
  { name: 'Rear Shock Absorber Replacement', description: 'Rear damper renewal and rubber bush check', price: 800, duration: 60 },
  { name: 'Suspension Bushing & Lower Arm Overhaul', description: 'Lower control arm, stabilizer bar end links, and subframe bush overhaul', price: 2200, duration: 180 },
  { name: 'Power Steering Rack & Tie-Rod Servicing', description: 'Steering rack backlash adjustment, tie-rod end and rack boot replacement', price: 1800, duration: 150 },

  // Clutch & Transmission
  { name: 'Clutch Overhaul & Plate Replacement', description: 'Gearbox drop, clutch friction disc, pressure plate, and release bearing replacement', price: 3800, duration: 300 },
  { name: 'Manual Gearbox Fluid Service', description: 'Transmission oil drain and refill with specified synthetic gear oil', price: 500, duration: 45 },
  { name: 'Automatic Transmission (AT/CVT) Flush', description: 'Automatic transmission fluid flush, strainer/filter replacement, and adaptation', price: 2500, duration: 120 },
  { name: 'Drive Shaft & CV Joint Boot Repair', description: 'Drive axle removal, constant velocity joint repacking with high-temp grease & new boot', price: 1200, duration: 90 },

  // Air Conditioning & Climate Control
  { name: 'Car AC Servicing & Gas Recharge', description: 'AC vacuum leak check, compressor oil refill, and pure R134a refrigerant charge', price: 2200, duration: 90 },
  { name: 'AC Cooling Coil / Evaporator Cleaning', description: 'Dashboard evaporator foam deep cleaning and fungal odor removal', price: 1500, duration: 120 },
  { name: 'AC Compressor Clutch Repair / Replacement', description: 'Compressor magnetic clutch coil, bearing, and pulley servicing', price: 2000, duration: 150 },

  // Electrical & Battery
  { name: 'Car Battery Health Test & Terminal Service', description: 'Digital battery CCA health test, specific gravity test, and anti-corrosion grease', price: 250, duration: 30 },
  { name: 'Alternator Repair / Overhaul', description: 'Alternator diode rectifier, voltage regulator, and carbon brush replacement', price: 1600, duration: 120 },
  { name: 'Starter Motor Repair & Servicing', description: 'Bendix gear, solenoid switch, and armature brush servicing', price: 1400, duration: 90 },
  { name: 'Headlight Restoration & Alignment', description: 'Headlamp UV haze polish and optical beam level adjustment', price: 700, duration: 60 },

  // Fuel System & Intake
  { name: 'Fuel Injector Ultrasonic Cleaning', description: 'Ultrasonic bath injector cleaning, spray pattern testing, and O-ring replacement', price: 1600, duration: 90 },
  { name: 'Fuel Pump Replacement & Tank Cleaning', description: 'High-pressure fuel pump assembly installation and fuel tank sedimentation flush', price: 1800, duration: 120 },

  // Detailing, Washing & Body Care
  { name: 'Complete Foam Wash & Interior Vacuum', description: 'High-pressure foam exterior wash, underbody rinse, interior vacuuming & dashboard polish', price: 500, duration: 60 },
  { name: 'Deep Interior Foam Spa & Sanitization', description: 'Steam upholstery shampoo, roof liner cleaning, carpet deep extraction & AC duct sanitize', price: 1800, duration: 180 },
  { name: 'Exterior Machine Rubbing & Wax Polish', description: 'Paint swirl mark removal, compounding, and carnauba wax paint protection', price: 2400, duration: 240 },
  { name: 'Underbody Anti-Rust Rubberized Coating', description: 'Complete chassis and wheel well bitumen rubberized anti-corrosion spray (5-yr warranty)', price: 2200, duration: 90 },
  { name: 'Dent Removal & Panel Paint (Per Panel)', description: 'Spot dent pulling, primer application, computer color matching, and clear coat baking', price: 2500, duration: 360 }
];

let defaultServicesChecked = false;
async function ensureDefaultServices() {
  if (defaultServicesChecked) return;
  try {
    for (const s of DEFAULT_AUTOMOTIVE_SERVICES) {
      await query(
        `INSERT INTO services (name, description, base_price, duration)
         SELECT $1, $2, $3, $4
         WHERE NOT EXISTS (SELECT 1 FROM services WHERE LOWER(name) = LOWER($1))`,
        [s.name, s.description, s.price, s.duration]
      );
    }
    defaultServicesChecked = true;
  } catch (err) {
    console.warn('Could not auto-seed default services:', err);
  }
}

// Get all services
router.get('/', async (req: AuthRequest, res) => {
  try {
    await ensureDefaultServices();

    const result = await query(
      'SELECT id, name, description, base_price as price, duration, is_active as "isActive", created_at as "createdAt", updated_at as "updatedAt" FROM services WHERE is_active = true ORDER BY name'
    );

    res.json({ services: result.rows });
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
      'SELECT id, name, description, base_price as price, duration, is_active as "isActive", created_at as "createdAt", updated_at as "updatedAt" FROM services WHERE id = $1 AND is_active = true',
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
router.post('/', requireRole(['TECHNICIAN', 'MANAGER']), async (req: AuthRequest, res) => {
  try {
    const { error, value } = createServiceSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const { name, description, price, duration } = value;

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
      'INSERT INTO services (name, description, base_price, duration) VALUES ($1, $2, $3, $4) RETURNING id, name, description, base_price as price, duration, is_active as "isActive", created_at as "createdAt", updated_at as "updatedAt"',
      [name, description || null, price, duration || 60]
    );

    res.status(201).json({ service: result.rows[0] });
  } catch (error) {
    console.error('Create service error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Update service
router.put('/:id', requireRole(['TECHNICIAN', 'MANAGER']), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { error, value } = createServiceSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const { name, description, price, duration } = value;

    // Check if service exists
    const existingService = await query('SELECT id FROM services WHERE id = $1', [id]);
    if (existingService.rows.length === 0) {
      return res.status(404).json({ message: 'Service not found' });
    }

    // Check name collision
    const nameCollision = await query('SELECT id FROM services WHERE LOWER(name) = LOWER($1) AND id != $2', [name, id]);
    if (nameCollision.rows.length > 0) {
      return res.status(400).json({ message: 'Another service with this name already exists' });
    }

    // Update service
    const result = await query(
      'UPDATE services SET name = $1, description = $2, base_price = $3, duration = $4, updated_at = CURRENT_TIMESTAMP WHERE id = $5 RETURNING id, name, description, base_price as price, duration, is_active as "isActive", created_at as "createdAt", updated_at as "updatedAt"',
      [name, description || null, price, duration || 60, id]
    );

    res.json({ service: result.rows[0] });
  } catch (error) {
    console.error('Update service error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Delete service
router.delete('/:id', requireRole(['MANAGER']), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    // Check if service exists
    const existingService = await query('SELECT id FROM services WHERE id = $1', [id]);
    if (existingService.rows.length === 0) {
      return res.status(404).json({ message: 'Service not found' });
    }

    // Soft delete service
    await query('UPDATE services SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1', [id]);

    res.json({ message: 'Service deleted successfully' });
  } catch (error) {
    console.error('Delete service error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;

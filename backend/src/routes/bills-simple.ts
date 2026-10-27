import express from 'express';
import { query } from '../database/connection';
import { AuthRequest, requireRole } from '../middleware/auth';
import Joi from 'joi';

const router = express.Router();

// Validation schemas
const createBillSchema = Joi.object({
  customerId: Joi.string().required(),
  technicianId: Joi.string().allow('', null).optional(),
  vehicleId: Joi.string().uuid().allow('', null).optional(),
  serviceDate: Joi.date().required(),
  services: Joi.array().items(Joi.object({
    serviceId: Joi.string().required(),
    description: Joi.string().allow('', null).optional(),
    quantity: Joi.number().min(0.001).default(1),
    unitPrice: Joi.number().min(0).required()
  })).optional(),
  spareParts: Joi.array().items(Joi.object({
    sparePartId: Joi.string().required(),
    description: Joi.string().allow('', null).optional(),
    quantity: Joi.number().min(0.001).required(),
    unitPrice: Joi.number().min(0).required()
  })).optional(),
  discountAmount: Joi.number().min(0).default(0),
  taxRate: Joi.number().min(0).max(100).default(0),
  notes: Joi.string().allow('', null).optional()
});

const paymentSchema = Joi.object({
  amount: Joi.number().positive().required(),
  paymentMethod: Joi.string().required(),
  reference: Joi.string().allow('', null).optional(),
  notes: Joi.string().allow('', null).optional()
});

// Get all bills
router.get('/', async (req: AuthRequest, res) => {
  try {
    const { user } = req;
    let queryText = `
      SELECT b.*, 
             c.name as customer_name, c.phone as customer_phone, c.email as customer_email,
             u.name as technician_name,
             cv.license_plate as vehicle_number,
             cv.vin as vehicle_vin,
             cv.year as vehicle_year,
             TRIM(CONCAT(vm.name, ' ', vmo.name)) as vehicle_model
      FROM bills b
      LEFT JOIN customers c ON b.customer_id = c.id
      LEFT JOIN users u ON b.technician_id = u.id
      LEFT JOIN customer_vehicles cv ON b.vehicle_id = cv.id
      LEFT JOIN vehicle_makes vm ON cv.make_id = vm.id
      LEFT JOIN vehicle_models vmo ON cv.model_id = vmo.id
    `;
    
    let params: any[] = [];
    
    // Filter based on user role (Row-Level Security)
    if (user?.role === 'CUSTOMER') {
      queryText += ' WHERE (b.customer_id IN (SELECT id FROM customers WHERE user_id = $1 OR phone = $2) OR b.customer_id = (SELECT id FROM customers WHERE phone = $2))';
      params.push(user.id, user.phone);
    } else if (user?.role === 'TECHNICIAN') {
      queryText += ' WHERE b.technician_id = $1';
      params.push(user.id);
    }
    
    queryText += ' ORDER BY b.created_at DESC';
    
    const result = await query(queryText, params);
    
    res.json({ bills: result.rows });
  } catch (error) {
    console.error('Get bills error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get bill by ID
router.get('/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { user } = req;
    
    let queryText = `
      SELECT b.*, 
             c.name as customer_name, c.phone as customer_phone, c.email as customer_email, c.address as customer_address,
             u.name as technician_name, u.phone as technician_phone,
             cv.license_plate as vehicle_number,
             cv.vin as vehicle_vin,
             cv.year as vehicle_year,
             TRIM(CONCAT(vm.name, ' ', vmo.name)) as vehicle_model
      FROM bills b
      LEFT JOIN customers c ON b.customer_id = c.id
      LEFT JOIN users u ON b.technician_id = u.id
      LEFT JOIN customer_vehicles cv ON b.vehicle_id = cv.id
      LEFT JOIN vehicle_makes vm ON cv.make_id = vm.id
      LEFT JOIN vehicle_models vmo ON cv.model_id = vmo.id
      WHERE b.id = $1
    `;
    
    let params = [id];
    
    // Add role-based filtering (Row-Level Security)
    if (user?.role === 'CUSTOMER') {
      queryText += ' AND (b.customer_id IN (SELECT id FROM customers WHERE user_id = $2 OR phone = $3) OR b.customer_id = (SELECT id FROM customers WHERE phone = $3))';
      params.push(user.id, user.phone);
    } else if (user?.role === 'TECHNICIAN') {
      queryText += ' AND b.technician_id = $2';
      params.push(user.id);
    }
    
    const billResult = await query(queryText, params);
    
    if (billResult.rows.length === 0) {
      return res.status(404).json({ message: 'Bill not found' });
    }
    
    const bill = billResult.rows[0];
    
    // Get bill services
    const servicesResult = await query(`
      SELECT bs.*, s.name as service_name, s.description
      FROM bill_services bs
      JOIN services s ON bs.service_id = s.id
      WHERE bs.bill_id = $1
    `, [id]);
    
    // Get bill spare parts
    const sparePartsResult = await query(`
      SELECT bsp.id, bsp.bill_id, bsp.spare_part_id, bsp.quantity, bsp.unit_price, bsp.total_price, bsp.created_at,
             sp.name as spare_part_name, sp.part_number, sp.unit
      FROM bill_spare_parts bsp
      JOIN spare_parts sp ON bsp.spare_part_id = sp.id
      WHERE bsp.bill_id = $1
    `, [id]);

    // Get payments
    const paymentsResult = await query(`
      SELECT id, bill_id, amount, payment_method as "paymentMethod", reference, notes, created_at as "paymentDate"
      FROM payments
      WHERE bill_id = $1
      ORDER BY created_at ASC
    `, [id]);
    
    res.json({
      bill: {
        ...bill,
        services: servicesResult.rows,
        spareParts: sparePartsResult.rows,
        payments: paymentsResult.rows
      }
    });
  } catch (error) {
    console.error('Get bill error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Create new bill
router.post('/', requireRole(['TECHNICIAN', 'MANAGER']), async (req: AuthRequest, res) => {
  try {
    const { error, value } = createBillSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const { customerId, technicianId, vehicleId, serviceDate, services, spareParts, discountAmount, taxRate, notes } = value;

    // Generate readable bill number
    const billNumber = `WOW-${Date.now().toString().slice(-6)}`;

    // Calculate subtotal
    let subtotal = 0;
    
    if (services && services.length > 0) {
      for (const service of services) {
        subtotal += service.quantity * service.unitPrice;
      }
    }
    
    if (spareParts && spareParts.length > 0) {
      for (const part of spareParts) {
        subtotal += part.quantity * part.unitPrice;
      }
    }

    // Calculate tax and total
    const taxAmount = subtotal * (taxRate / 100);
    const totalAmount = Math.max(0, subtotal - discountAmount + taxAmount);

    // Create bill
    const billResult = await query(
      `INSERT INTO bills (bill_number, customer_id, technician_id, vehicle_id, service_date, subtotal, discount_amount, tax_rate, tax_amount, total_amount, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [billNumber, customerId, technicianId || null, vehicleId || null, serviceDate, subtotal, discountAmount, taxRate, taxAmount, totalAmount, notes || null]
    );

    const bill = billResult.rows[0];

    // Add services
    if (services && services.length > 0) {
      for (const service of services) {
        await query(
          'INSERT INTO bill_services (bill_id, service_id, quantity, unit_price, total_price) VALUES ($1, $2, $3, $4, $5)',
          [bill.id, service.serviceId, service.quantity, service.unitPrice, service.quantity * service.unitPrice]
        );
      }
    }

    // Add spare parts & deduct stock
    if (spareParts && spareParts.length > 0) {
      for (const part of spareParts) {
        await query(
          'INSERT INTO bill_spare_parts (bill_id, spare_part_id, quantity, unit_price, total_price) VALUES ($1, $2, $3, $4, $5)',
          [bill.id, part.sparePartId, part.quantity, part.unitPrice, part.quantity * part.unitPrice]
        );

        // Deduct from inventory stock
        await query(
          'UPDATE spare_parts SET stock_quantity = GREATEST(0, stock_quantity - $1) WHERE id = $2',
          [part.quantity, part.sparePartId]
        );
      }
    }

    res.status(201).json({ message: 'Bill created successfully', bill });
  } catch (error) {
    console.error('Create bill error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Update bill
router.put('/:id', requireRole(['TECHNICIAN', 'MANAGER']), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { error, value } = createBillSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const { customerId, technicianId, vehicleId, serviceDate, services, spareParts, discountAmount, taxRate, notes } = value;

    // Calculate subtotal
    let subtotal = 0;
    
    if (services && services.length > 0) {
      for (const service of services) {
        subtotal += service.quantity * service.unitPrice;
      }
    }
    
    if (spareParts && spareParts.length > 0) {
      for (const part of spareParts) {
        subtotal += part.quantity * part.unitPrice;
      }
    }

    // Calculate tax and total
    const taxAmount = subtotal * (taxRate / 100);
    const totalAmount = Math.max(0, subtotal - discountAmount + taxAmount);

    // Restore previous spare parts stock
    const oldParts = await query('SELECT spare_part_id, quantity FROM bill_spare_parts WHERE bill_id = $1', [id]);
    for (const oldPart of oldParts.rows) {
      await query(
        'UPDATE spare_parts SET stock_quantity = stock_quantity + $1 WHERE id = $2',
        [oldPart.quantity, oldPart.spare_part_id]
      );
    }

    // Update bill
    const billResult = await query(
      `UPDATE bills 
       SET technician_id = $1, vehicle_id = $2, service_date = $3, subtotal = $4, discount_amount = $5, tax_rate = $6, tax_amount = $7, total_amount = $8, notes = $9, updated_at = CURRENT_TIMESTAMP
       WHERE id = $10
       RETURNING *`,
      [technicianId || null, vehicleId || null, serviceDate, subtotal, discountAmount, taxRate, taxAmount, totalAmount, notes || null, id]
    );

    if (billResult.rows.length === 0) {
      return res.status(404).json({ message: 'Bill not found' });
    }

    const bill = billResult.rows[0];

    // Delete existing services and spare parts
    await query('DELETE FROM bill_services WHERE bill_id = $1', [id]);
    await query('DELETE FROM bill_spare_parts WHERE bill_id = $1', [id]);

    // Add updated services
    if (services && services.length > 0) {
      for (const service of services) {
        await query(
          'INSERT INTO bill_services (bill_id, service_id, quantity, unit_price, total_price) VALUES ($1, $2, $3, $4, $5)',
          [bill.id, service.serviceId, service.quantity, service.unitPrice, service.quantity * service.unitPrice]
        );
      }
    }

    // Add updated spare parts & deduct new quantities
    if (spareParts && spareParts.length > 0) {
      for (const part of spareParts) {
        await query(
          'INSERT INTO bill_spare_parts (bill_id, spare_part_id, quantity, unit_price, total_price) VALUES ($1, $2, $3, $4, $5)',
          [bill.id, part.sparePartId, part.quantity, part.unitPrice, part.quantity * part.unitPrice]
        );

        await query(
          'UPDATE spare_parts SET stock_quantity = GREATEST(0, stock_quantity - $1) WHERE id = $2',
          [part.quantity, part.sparePartId]
        );
      }
    }

    res.json({ message: 'Bill updated successfully', bill });
  } catch (error) {
    console.error('Update bill error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Add payment to bill
router.post('/:id/payments', requireRole(['TECHNICIAN', 'MANAGER']), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { error, value } = paymentSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const { amount, paymentMethod, reference, notes } = value;

    // Check if bill exists
    const billResult = await query('SELECT id, total_amount, paid_amount FROM bills WHERE id = $1', [id]);
    if (billResult.rows.length === 0) {
      return res.status(404).json({ message: 'Bill not found' });
    }

    const bill = billResult.rows[0];

    // Insert payment
    const paymentResult = await query(
      `INSERT INTO payments (bill_id, amount, payment_method, reference, notes)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, bill_id, amount, payment_method as "paymentMethod", reference, notes, created_at as "paymentDate"`,
      [id, amount, paymentMethod, reference || null, notes || null]
    );

    const newPayment = paymentResult.rows[0];

    // Calculate total paid amount
    const totalPaidResult = await query(
      'SELECT COALESCE(SUM(amount), 0) as total_paid FROM payments WHERE bill_id = $1',
      [id]
    );
    const totalPaid = parseFloat(totalPaidResult.rows[0].total_paid);
    const totalAmount = parseFloat(bill.total_amount);

    let paymentStatus = 'PENDING';
    if (totalPaid >= totalAmount) {
      paymentStatus = 'PAID';
    } else if (totalPaid > 0) {
      paymentStatus = 'PARTIAL';
    }

    // Update bill payment status and paid amount
    const updatedBillResult = await query(
      `UPDATE bills 
       SET paid_amount = $1, payment_status = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING *`,
      [totalPaid, paymentStatus, id]
    );

    res.status(201).json({
      message: 'Payment added successfully',
      payment: newPayment,
      bill: updatedBillResult.rows[0]
    });
  } catch (error) {
    console.error('Add payment error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get payments for a bill
router.get('/:id/payments', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const result = await query(
      `SELECT id, bill_id, amount, payment_method as "paymentMethod", reference, notes, created_at as "paymentDate"
       FROM payments 
       WHERE bill_id = $1 
       ORDER BY created_at ASC`,
      [id]
    );

    res.json({ payments: result.rows });
  } catch (error) {
    console.error('Get payments error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Delete bill
router.delete('/:id', requireRole(['MANAGER']), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    // Check if bill exists
    const existingBill = await query('SELECT id FROM bills WHERE id = $1', [id]);
    if (existingBill.rows.length === 0) {
      return res.status(404).json({ message: 'Bill not found' });
    }

    // Restore stock for deleted bill spare parts
    const oldParts = await query('SELECT spare_part_id, quantity FROM bill_spare_parts WHERE bill_id = $1', [id]);
    for (const oldPart of oldParts.rows) {
      await query(
        'UPDATE spare_parts SET stock_quantity = stock_quantity + $1 WHERE id = $2',
        [oldPart.quantity, oldPart.spare_part_id]
      );
    }

    // Delete bill (cascades to bill_services, bill_spare_parts, payments)
    await query('DELETE FROM bills WHERE id = $1', [id]);

    res.json({ message: 'Bill deleted successfully' });
  } catch (error) {
    console.error('Delete bill error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;

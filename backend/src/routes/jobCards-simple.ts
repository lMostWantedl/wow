import express from 'express';
import { query } from '../database/connection';
import { AuthRequest } from '../middleware/auth';
import Joi from 'joi';

const router = express.Router();

// Helper to recalculate job card totals
const recalculateJobCardTotals = async (jobCardId: string) => {
  const servicesResult = await query(
    'SELECT COALESCE(SUM(total_price), 0) as total FROM job_card_services WHERE job_card_id = $1',
    [jobCardId]
  );
  const partsResult = await query(
    'SELECT COALESCE(SUM(total_price), 0) as total FROM job_card_spare_parts WHERE job_card_id = $1',
    [jobCardId]
  );

  const servicesTotal = parseFloat(servicesResult.rows[0]?.total || '0');
  const partsTotal = parseFloat(partsResult.rows[0]?.total || '0');
  const actualAmount = servicesTotal + partsTotal;

  await query(
    'UPDATE job_cards SET actual_amount = $1 WHERE id = $2',
    [actualAmount, jobCardId]
  );

  return actualAmount;
};

// GET /api/job-cards - List all job cards with search & filters
router.get('/', async (req: AuthRequest, res) => {
  try {
    const { status, search, priority } = req.query;

    let queryText = `
      SELECT jc.*,
             c.name as customer_name, c.phone as customer_phone, c.email as customer_email,
             cv.license_plate as vehicle_number,
             cv.vin as vehicle_vin,
             cv.year as vehicle_year,
             TRIM(CONCAT(vm.name, ' ', vmo.name)) as vehicle_model,
             b.bill_number,
             (
               SELECT json_agg(json_build_object(
                 'id', u.id,
                 'name', u.name,
                 'role', jct.role
               ))
               FROM job_card_technicians jct
               JOIN users u ON jct.technician_id = u.id
               WHERE jct.job_card_id = jc.id
             ) as technicians,
             (
               SELECT COUNT(*) FROM job_card_services jcs WHERE jcs.job_card_id = jc.id
             ) as services_count,
             (
               SELECT COUNT(*) FROM job_card_spare_parts jcsp WHERE jcsp.job_card_id = jc.id
             ) as parts_count
      FROM job_cards jc
      JOIN customers c ON jc.customer_id = c.id
      LEFT JOIN customer_vehicles cv ON jc.vehicle_id = cv.id
      LEFT JOIN vehicle_makes vm ON cv.make_id = vm.id
      LEFT JOIN vehicle_models vmo ON cv.model_id = vmo.id
      LEFT JOIN bills b ON jc.bill_id = b.id
      WHERE 1=1
    `;

    const queryParams: any[] = [];
    let paramIndex = 1;

    if (status && status !== 'ALL') {
      queryText += ` AND jc.status = $${paramIndex}`;
      queryParams.push(status);
      paramIndex++;
    }

    if (priority && priority !== 'ALL') {
      queryText += ` AND jc.priority = $${paramIndex}`;
      queryParams.push(priority);
      paramIndex++;
    }

    if (search) {
      queryText += ` AND (
        jc.job_card_number ILIKE $${paramIndex} OR
        c.name ILIKE $${paramIndex} OR
        c.phone ILIKE $${paramIndex} OR
        cv.license_plate ILIKE $${paramIndex}
      )`;
      queryParams.push(`%${search}%`);
      paramIndex++;
    }

    queryText += ` ORDER BY jc.created_at DESC`;

    const result = await query(queryText, queryParams);
    res.json({ jobCards: result.rows });
  } catch (error: any) {
    console.error('Get job cards error:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
});

// GET /api/job-cards/:id - Get single job card with full items & technicians
router.get('/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const jcResult = await query(`
      SELECT jc.*,
             c.name as customer_name, c.phone as customer_phone, c.email as customer_email, c.address as customer_address,
             cv.license_plate as vehicle_number,
             cv.vin as vehicle_vin,
             cv.year as vehicle_year,
             TRIM(CONCAT(vm.name, ' ', vmo.name)) as vehicle_model,
             b.bill_number, b.payment_status as bill_payment_status, b.total_amount as bill_total_amount
      FROM job_cards jc
      JOIN customers c ON jc.customer_id = c.id
      LEFT JOIN customer_vehicles cv ON jc.vehicle_id = cv.id
      LEFT JOIN vehicle_makes vm ON cv.make_id = vm.id
      LEFT JOIN vehicle_models vmo ON cv.model_id = vmo.id
      LEFT JOIN bills b ON jc.bill_id = b.id
      WHERE jc.id = $1
    `, [id]);

    if (jcResult.rows.length === 0) {
      return res.status(404).json({ message: 'Job Card not found' });
    }

    const jobCard = jcResult.rows[0];

    // Assigned technicians
    const techResult = await query(`
      SELECT jct.*, u.name as technician_name, u.phone as technician_phone, u.email as technician_email
      FROM job_card_technicians jct
      JOIN users u ON jct.technician_id = u.id
      WHERE jct.job_card_id = $1
      ORDER BY jct.assigned_at ASC
    `, [id]);

    // Services
    const servicesResult = await query(`
      SELECT jcs.*, u.name as technician_name
      FROM job_card_services jcs
      LEFT JOIN users u ON jcs.technician_id = u.id
      WHERE jcs.job_card_id = $1
      ORDER BY jcs.created_at ASC
    `, [id]);

    // Spare parts
    const partsResult = await query(`
      SELECT jcsp.*, sp.stock_quantity
      FROM job_card_spare_parts jcsp
      LEFT JOIN spare_parts sp ON jcsp.spare_part_id = sp.id
      WHERE jcsp.job_card_id = $1
      ORDER BY jcsp.created_at ASC
    `, [id]);

    res.json({
      jobCard: {
        ...jobCard,
        technicians: techResult.rows,
        services: servicesResult.rows,
        spareParts: partsResult.rows
      }
    });
  } catch (error: any) {
    console.error('Get job card details error:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
});

// POST /api/job-cards - Create new Job Card
router.post('/', async (req: AuthRequest, res) => {
  try {
    const {
      customerId,
      vehicleId,
      priority = 'NORMAL',
      odometerReading = 0,
      fuelLevel = '50%',
      customerComplaints = '',
      technicianDiagnosis = '',
      inventoryChecklist = {},
      visualInspectionNotes = '',
      expectedDeliveryDate,
      technicianIds = [],
      services = [],
      spareParts = [],
      status = 'OPEN'
    } = req.body;

    if (!customerId) {
      return res.status(400).json({ message: 'Customer ID is required' });
    }

    // Generate unique Job Card number
    const countResult = await query('SELECT COUNT(*) as count FROM job_cards');
    const seq = parseInt(countResult.rows[0]?.count || '0', 10) + 1;
    const year = new Date().getFullYear();
    const jobCardNumber = `JC-${year}-${String(seq).padStart(4, '0')}`;

    // Compute initial estimate
    let estimatedAmount = 0;
    for (const s of services) {
      estimatedAmount += (Number(s.hoursQty || s.quantity || 1) * Number(s.unitPrice || 0));
    }
    for (const p of spareParts) {
      estimatedAmount += (Number(p.quantity || 1) * Number(p.unitPrice || 0));
    }

    // Insert job card
    const jcInsertResult = await query(`
      INSERT INTO job_cards (
        job_card_number, customer_id, vehicle_id, status, priority,
        odometer_reading, fuel_level, customer_complaints, technician_diagnosis,
        inventory_checklist, visual_inspection_notes, estimated_amount, actual_amount,
        expected_delivery_date, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *
    `, [
      jobCardNumber,
      customerId,
      vehicleId || null,
      status,
      priority,
      parseInt(odometerReading, 10) || 0,
      fuelLevel,
      customerComplaints,
      technicianDiagnosis,
      JSON.stringify(inventoryChecklist),
      visualInspectionNotes,
      estimatedAmount,
      estimatedAmount,
      expectedDeliveryDate || null,
      req.user?.id || null
    ]);

    const createdJobCard = jcInsertResult.rows[0];

    // Assign multiple technicians (Stored in Job Card only!)
    if (Array.isArray(technicianIds) && technicianIds.length > 0) {
      for (const techId of technicianIds) {
        if (techId) {
          await query(`
            INSERT INTO job_card_technicians (job_card_id, technician_id, role)
            VALUES ($1, $2, 'TECHNICIAN')
            ON CONFLICT (job_card_id, technician_id) DO NOTHING
          `, [createdJobCard.id, techId]);
        }
      }
    }

    // Add initial services
    if (Array.isArray(services) && services.length > 0) {
      for (const s of services) {
        const qty = Number(s.hoursQty || s.quantity || 1);
        const price = Number(s.unitPrice || 0);
        await query(`
          INSERT INTO job_card_services (
            job_card_id, service_id, service_name, description, hours_qty, unit_price, total_price, is_extra_work
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, false)
        `, [
          createdJobCard.id,
          s.serviceId || null,
          s.serviceName || s.name || 'Workshop Service',
          s.description || '',
          qty,
          price,
          qty * price
        ]);
      }
    }

    // Add initial spare parts
    if (Array.isArray(spareParts) && spareParts.length > 0) {
      for (const p of spareParts) {
        const qty = Number(p.quantity || 1);
        const price = Number(p.unitPrice || 0);
        await query(`
          INSERT INTO job_card_spare_parts (
            job_card_id, spare_part_id, part_name, part_number, description, quantity, unit, unit_price, total_price, is_extra_work
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, false)
        `, [
          createdJobCard.id,
          p.sparePartId || null,
          p.partName || p.name || 'Spare Part',
          p.partNumber || p.part_number || null,
          p.description || '',
          qty,
          p.unit || 'pieces',
          price,
          qty * price
        ]);
      }
    }

    await recalculateJobCardTotals(createdJobCard.id);

    res.status(201).json({
      message: 'Job Card created successfully',
      jobCard: createdJobCard
    });
  } catch (error: any) {
    console.error('Create job card error:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
});

// PUT /api/job-cards/:id - Update Job Card status, details, and multiple technicians
router.put('/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const {
      status,
      priority,
      odometerReading,
      fuelLevel,
      customerComplaints,
      technicianDiagnosis,
      inventoryChecklist,
      visualInspectionNotes,
      expectedDeliveryDate,
      customerApproved,
      technicianIds
    } = req.body;

    const existingResult = await query('SELECT * FROM job_cards WHERE id = $1', [id]);
    if (existingResult.rows.length === 0) {
      return res.status(404).json({ message: 'Job Card not found' });
    }

    const current = existingResult.rows[0];

    const updatedResult = await query(`
      UPDATE job_cards SET
        status = COALESCE($1, status),
        priority = COALESCE($2, priority),
        odometer_reading = COALESCE($3, odometer_reading),
        fuel_level = COALESCE($4, fuel_level),
        customer_complaints = COALESCE($5, customer_complaints),
        technician_diagnosis = COALESCE($6, technician_diagnosis),
        inventory_checklist = COALESCE($7, inventory_checklist),
        visual_inspection_notes = COALESCE($8, visual_inspection_notes),
        expected_delivery_date = COALESCE($9, expected_delivery_date),
        customer_approved = COALESCE($10, customer_approved),
        customer_approved_at = CASE WHEN $10 = true AND customer_approved = false THEN CURRENT_TIMESTAMP ELSE customer_approved_at END,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $11
      RETURNING *
    `, [
      status,
      priority,
      odometerReading != null ? parseInt(odometerReading, 10) : null,
      fuelLevel,
      customerComplaints,
      technicianDiagnosis,
      inventoryChecklist ? JSON.stringify(inventoryChecklist) : null,
      visualInspectionNotes,
      expectedDeliveryDate || null,
      customerApproved != null ? customerApproved : null,
      id
    ]);

    // Update technicians if explicitly provided
    if (Array.isArray(technicianIds)) {
      await query('DELETE FROM job_card_technicians WHERE job_card_id = $1', [id]);
      for (const techId of technicianIds) {
        if (techId) {
          await query(`
            INSERT INTO job_card_technicians (job_card_id, technician_id, role)
            VALUES ($1, $2, 'TECHNICIAN')
            ON CONFLICT (job_card_id, technician_id) DO NOTHING
          `, [id, techId]);
        }
      }
    }

    res.json({
      message: 'Job Card updated successfully',
      jobCard: updatedResult.rows[0]
    });
  } catch (error: any) {
    console.error('Update job card error:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
});

// POST /api/job-cards/:id/services - Add service / extra work to job card
router.post('/:id/services', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const {
      serviceId,
      serviceName,
      description = '',
      hoursQty = 1,
      unitPrice = 0,
      isExtraWork = true,
      technicianId
    } = req.body;

    const qty = Number(hoursQty) || 1;
    const price = Number(unitPrice) || 0;
    const total = qty * price;

    let finalServiceName = serviceName;
    if (!finalServiceName && serviceId) {
      const sResult = await query('SELECT name FROM services WHERE id = $1', [serviceId]);
      finalServiceName = sResult.rows[0]?.name || 'Labor Service';
    }

    const result = await query(`
      INSERT INTO job_card_services (
        job_card_id, service_id, service_name, description, hours_qty, unit_price, total_price, is_extra_work, technician_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [
      id,
      serviceId || null,
      finalServiceName || 'Workshop Service',
      description,
      qty,
      price,
      total,
      Boolean(isExtraWork),
      technicianId || null
    ]);

    const updatedActual = await recalculateJobCardTotals(id);

    res.status(201).json({
      message: isExtraWork ? 'Extra work service added successfully' : 'Service added successfully',
      service: result.rows[0],
      totalAmount: updatedActual
    });
  } catch (error: any) {
    console.error('Add service to job card error:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
});

// DELETE /api/job-cards/:id/services/:serviceId - Remove service from job card
router.delete('/:id/services/:serviceId', async (req: AuthRequest, res) => {
  try {
    const { id, serviceId } = req.params;
    await query('DELETE FROM job_card_services WHERE id = $1 AND job_card_id = $2', [serviceId, id]);
    const updatedActual = await recalculateJobCardTotals(id);
    res.json({ message: 'Service removed successfully', totalAmount: updatedActual });
  } catch (error: any) {
    console.error('Delete service error:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
});

// POST /api/job-cards/:id/spare-parts - Add spare part / extra part to job card
router.post('/:id/spare-parts', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const {
      sparePartId,
      partName,
      partNumber,
      description = '',
      quantity = 1,
      unit = 'pieces',
      unitPrice = 0,
      isExtraWork = true
    } = req.body;

    const qty = Number(quantity) || 1;
    const price = Number(unitPrice) || 0;
    const total = qty * price;

    let finalPartName = partName;
    let finalPartNumber = partNumber;
    let finalUnit = unit;

    if (sparePartId) {
      const spResult = await query('SELECT name, part_number, unit, price FROM spare_parts WHERE id = $1', [sparePartId]);
      if (spResult.rows.length > 0) {
        finalPartName = finalPartName || spResult.rows[0].name;
        finalPartNumber = finalPartNumber || spResult.rows[0].part_number;
        finalUnit = finalUnit || spResult.rows[0].unit;
      }
    }

    const result = await query(`
      INSERT INTO job_card_spare_parts (
        job_card_id, spare_part_id, part_name, part_number, description, quantity, unit, unit_price, total_price, is_extra_work
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `, [
      id,
      sparePartId || null,
      finalPartName || 'Spare Part',
      finalPartNumber || null,
      description,
      qty,
      finalUnit || 'pieces',
      price,
      total,
      Boolean(isExtraWork)
    ]);

    const updatedActual = await recalculateJobCardTotals(id);

    res.status(201).json({
      message: isExtraWork ? 'Extra spare part added successfully' : 'Spare part added successfully',
      sparePart: result.rows[0],
      totalAmount: updatedActual
    });
  } catch (error: any) {
    console.error('Add spare part to job card error:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
});

// DELETE /api/job-cards/:id/spare-parts/:partId - Remove spare part from job card
router.delete('/:id/spare-parts/:partId', async (req: AuthRequest, res) => {
  try {
    const { id, partId } = req.params;
    await query('DELETE FROM job_card_spare_parts WHERE id = $1 AND job_card_id = $2', [partId, id]);
    const updatedActual = await recalculateJobCardTotals(id);
    res.json({ message: 'Spare part removed successfully', totalAmount: updatedActual });
  } catch (error: any) {
    console.error('Delete spare part error:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
});

// POST /api/job-cards/:id/convert-to-invoice
// CONVERT JOB CARD TO INVOICE:
// Stores multiple technicians in Job Card only; DOES NOT carry technicians over to the Invoice!
router.post('/:id/convert-to-invoice', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { discountAmount = 0, taxRate = 18, notes = '' } = req.body;

    const jcResult = await query('SELECT * FROM job_cards WHERE id = $1', [id]);
    if (jcResult.rows.length === 0) {
      return res.status(404).json({ message: 'Job Card not found' });
    }

    const jobCard = jcResult.rows[0];

    if (jobCard.status === 'INVOICED' && jobCard.bill_id) {
      return res.status(400).json({
        message: 'Job Card has already been converted into an invoice',
        billId: jobCard.bill_id
      });
    }

    // Fetch services and spare parts
    const services = await query('SELECT * FROM job_card_services WHERE job_card_id = $1', [id]);
    const spareParts = await query('SELECT * FROM job_card_spare_parts WHERE job_card_id = $1', [id]);

    const servicesSubtotal = services.rows.reduce((sum, s) => sum + parseFloat(s.total_price || '0'), 0);
    const partsSubtotal = spareParts.rows.reduce((sum, p) => sum + parseFloat(p.total_price || '0'), 0);
    const subtotal = servicesSubtotal + partsSubtotal;

    const discount = parseFloat(discountAmount) || 0;
    const tax = parseFloat(taxRate) || 0;
    const taxableAmount = Math.max(0, subtotal - discount);
    const taxAmount = taxableAmount * (tax / 100);
    const totalAmount = taxableAmount + taxAmount;

    // Generate unique bill number
    const countResult = await query('SELECT COUNT(*) as count FROM bills');
    const billNum = `WOW-${Math.floor(100000 + Math.random() * 900000)}`;

    const invoiceNotes = notes || `Generated from Job Card #${jobCard.job_card_number}. Odo: ${jobCard.odometer_reading || 0} KM.`;

    // NOTICE: technician_id is set to NULL on the invoice as requested!
    // Multiple technicians remain strictly recorded in job_cards and job_card_technicians only.
    const billInsert = await query(`
      INSERT INTO bills (
        bill_number, customer_id, technician_id, vehicle_id, service_date,
        status, payment_status, subtotal, discount_amount, tax_rate, tax_amount,
        total_amount, paid_amount, notes
      ) VALUES ($1, $2, NULL, $3, CURRENT_DATE, 'PENDING', 'PENDING', $4, $5, $6, $7, $8, 0, $9)
      RETURNING *
    `, [
      billNum,
      jobCard.customer_id,
      jobCard.vehicle_id,
      subtotal,
      discount,
      tax,
      taxAmount,
      totalAmount,
      invoiceNotes
    ]);

    const createdBill = billInsert.rows[0];

    // Insert bill services
    for (const s of services.rows) {
      let finalServiceId = s.service_id;
      if (!finalServiceId) {
        // Fallback to first existing service if none linked
        const defaultService = await query('SELECT id FROM services LIMIT 1');
        finalServiceId = defaultService.rows[0]?.id;
      }

      if (finalServiceId) {
        await query(`
          INSERT INTO bill_services (bill_id, service_id, quantity, unit_price, total_price)
          VALUES ($1, $2, $3, $4, $5)
        `, [
          createdBill.id,
          finalServiceId,
          parseFloat(s.hours_qty || '1'),
          parseFloat(s.unit_price || '0'),
          parseFloat(s.total_price || '0')
        ]);
      }
    }

    // Insert bill spare parts & deduct inventory
    for (const p of spareParts.rows) {
      let finalPartId = p.spare_part_id;
      if (!finalPartId) {
        const defaultPart = await query('SELECT id FROM spare_parts LIMIT 1');
        finalPartId = defaultPart.rows[0]?.id;
      }

      if (finalPartId) {
        await query(`
          INSERT INTO bill_spare_parts (bill_id, spare_part_id, quantity, unit_price, total_price)
          VALUES ($1, $2, $3, $4, $5)
        `, [
          createdBill.id,
          finalPartId,
          parseFloat(p.quantity || '1'),
          parseFloat(p.unit_price || '0'),
          parseFloat(p.total_price || '0')
        ]);

        // Deduct stock
        await query(
          'UPDATE spare_parts SET stock_quantity = GREATEST(0, stock_quantity - $1) WHERE id = $2',
          [parseFloat(p.quantity || '1'), finalPartId]
        );
      }
    }

    // Update Job Card status to INVOICED and link bill_id
    await query(`
      UPDATE job_cards SET
        status = 'INVOICED',
        bill_id = $1,
        actual_delivery_date = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `, [createdBill.id, id]);

    res.status(201).json({
      message: 'Job Card successfully converted to Invoice!',
      bill: createdBill,
      billId: createdBill.id
    });
  } catch (error: any) {
    console.error('Convert job card to invoice error:', error);
    res.status(500).json({ message: 'Failed to convert Job Card to Invoice', error: error.message });
  }
});

export default router;

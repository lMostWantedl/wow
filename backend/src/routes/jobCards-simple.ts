import express from 'express';
import { query } from '../database/connection';
import { AuthRequest } from '../middleware/auth';
import Joi from 'joi';
import { generateExpenseNumber } from './financial-simple';

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

  // Calculate estimated amount (items that are part of Initial Quotation, is_extra_work = false)
  const estServicesResult = await query(
    'SELECT COALESCE(SUM(total_price), 0) as total FROM job_card_services WHERE job_card_id = $1 AND (is_extra_work = false OR is_extra_work IS NULL)',
    [jobCardId]
  );
  const estPartsResult = await query(
    'SELECT COALESCE(SUM(total_price), 0) as total FROM job_card_spare_parts WHERE job_card_id = $1 AND (is_extra_work = false OR is_extra_work IS NULL)',
    [jobCardId]
  );
  const estimatedAmount = parseFloat(estServicesResult.rows[0]?.total || '0') + parseFloat(estPartsResult.rows[0]?.total || '0');

  await query(
    'UPDATE job_cards SET actual_amount = $1, estimated_amount = $2 WHERE id = $3',
    [actualAmount, estimatedAmount, jobCardId]
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
             vm.name as vehicle_make,
             vmo.name as vehicle_model_name,
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
             vm.name as vehicle_make,
             vmo.name as vehicle_model_name,
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
      SELECT jcs.*, u.name as technician_name,
        COALESCE((
          SELECT json_agg(json_build_object('id', ut.id, 'name', ut.name, 'role', ut.role))
          FROM users ut
          WHERE ut.id::text IN (
            SELECT jsonb_array_elements_text(
              CASE 
                WHEN jcs.technician_ids IS NOT NULL AND jsonb_typeof(jcs.technician_ids) = 'array' AND jsonb_array_length(jcs.technician_ids) > 0
                  THEN jcs.technician_ids
                WHEN jcs.technician_id IS NOT NULL THEN jsonb_build_array(jcs.technician_id::text)
                ELSE '[]'::jsonb
              END
            )
          )
        ), '[]'::json) as assigned_technicians
      FROM job_card_services jcs
      LEFT JOIN users u ON jcs.technician_id = u.id
      WHERE jcs.job_card_id = $1
      ORDER BY jcs.created_at ASC
    `, [id]);

    // Spare parts
    const partsResult = await query(`
      SELECT jcsp.*, sp.stock_quantity, sp.cost as garage_cost, sp.supplier as default_supplier
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

        let sTechIds: string[] = [];
        if (Array.isArray(s.technicianIds)) {
          sTechIds = s.technicianIds.filter(Boolean);
        } else if (s.technicianId) {
          sTechIds = [s.technicianId];
        }
        const sPrimaryTechId = sTechIds.length > 0 ? sTechIds[0] : null;

        let initServiceType = s.serviceType || s.service_type || 'LABOR';
        let initVendor = s.vendorName || s.vendor_name || null;
        let initCost = Number(s.costPrice || s.cost_price || 0);

        if (s.serviceId) {
          const sRes = await query('SELECT service_type, default_vendor, default_cost FROM services WHERE id = $1', [s.serviceId]);
          if (sRes.rows.length > 0) {
            if (!s.serviceType && sRes.rows[0].service_type) initServiceType = sRes.rows[0].service_type;
            if (!s.vendorName && sRes.rows[0].default_vendor) initVendor = sRes.rows[0].default_vendor;
            if (!s.costPrice && sRes.rows[0].default_cost) initCost = Number(sRes.rows[0].default_cost);
          }
        }

        await query(`
          INSERT INTO job_card_services (
            job_card_id, service_id, service_name, service_type, vendor_name, cost_price, description, hours_qty, unit_price, total_price, is_extra_work, technician_id, technician_ids
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, false, $11, $12)
        `, [
          createdJobCard.id,
          s.serviceId || null,
          s.serviceName || s.name || 'Workshop Service',
          initServiceType,
          initVendor,
          initCost,
          s.description || '',
          qty,
          price,
          qty * price,
          sPrimaryTechId,
          JSON.stringify(sTechIds)
        ]);

        // Auto-add assigned service technician(s) to workshop technicians list
        for (const tid of sTechIds) {
          await query(`
            INSERT INTO job_card_technicians (job_card_id, technician_id, role)
            VALUES ($1, $2, 'TECHNICIAN')
            ON CONFLICT (job_card_id, technician_id) DO NOTHING
          `, [createdJobCard.id, tid]);
        }
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

// POST /api/job-cards/:id/services - Add service to job card (Initial Quotation or Extra Work)
router.post('/:id/services', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const {
      serviceId,
      serviceName,
      serviceType = 'LABOR',
      vendorName = null,
      costPrice = 0,
      description = '',
      hoursQty = 1,
      unitPrice = 0,
      isExtraWork = false,
      technicianId,
      technicianIds
    } = req.body;

    const qty = Number(hoursQty) || 1;
    const price = Number(unitPrice) || 0;
    const total = qty * price;
    const finalIsExtraWork = isExtraWork !== undefined ? Boolean(isExtraWork) : false;

    let effectiveTechIds: string[] = [];
    if (Array.isArray(technicianIds) && technicianIds.length > 0) {
      effectiveTechIds = technicianIds.filter(Boolean);
    } else if (technicianId) {
      effectiveTechIds = [technicianId];
    }
    const primaryTechId = effectiveTechIds.length > 0 ? effectiveTechIds[0] : null;

    let finalServiceName = serviceName;
    let finalServiceType = serviceType || 'LABOR';
    let finalVendorName = vendorName || null;
    let finalCostPrice = Number(costPrice) || 0;

    if (serviceId) {
      const sResult = await query('SELECT name, service_type, default_vendor, default_cost FROM services WHERE id = $1', [serviceId]);
      if (sResult.rows.length > 0) {
        if (!finalServiceName) finalServiceName = sResult.rows[0].name;
        if (!serviceType && sResult.rows[0].service_type) finalServiceType = sResult.rows[0].service_type;
        if (!vendorName && sResult.rows[0].default_vendor) finalVendorName = sResult.rows[0].default_vendor;
        if (!costPrice && sResult.rows[0].default_cost) finalCostPrice = Number(sResult.rows[0].default_cost) || 0;
      }
    }

    const result = await query(`
      INSERT INTO job_card_services (
        job_card_id, service_id, service_name, service_type, vendor_name, cost_price, description, hours_qty, unit_price, total_price, is_extra_work, technician_id, technician_ids
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `, [
      id,
      serviceId || null,
      finalServiceName || (finalServiceType === 'EXTERNAL_SERVICE' ? 'External Sublet Service' : 'Workshop Service'),
      finalServiceType,
      finalVendorName,
      finalCostPrice,
      description,
      qty,
      price,
      total,
      finalIsExtraWork,
      primaryTechId,
      JSON.stringify(effectiveTechIds)
    ]);

    // Auto-add assigned technicians to workshop team if not already present
    if (effectiveTechIds.length > 0) {
      for (const tId of effectiveTechIds) {
        await query(`
          INSERT INTO job_card_technicians (job_card_id, technician_id, role)
          VALUES ($1, $2, 'TECHNICIAN')
          ON CONFLICT (job_card_id, technician_id) DO NOTHING
        `, [id, tId]);
      }
    }

    const updatedActual = await recalculateJobCardTotals(id);

    res.status(201).json({
      message: finalIsExtraWork ? 'Extra work service added successfully' : 'Service added successfully',
      service: result.rows[0],
      totalAmount: updatedActual
    });
  } catch (error: any) {
    console.error('Add service to job card error:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
});

// PUT /api/job-cards/:id/services/:serviceId - Update service / labor in job card
router.put('/:id/services/:serviceId', async (req: AuthRequest, res) => {
  try {
    const { id, serviceId } = req.params;
    const {
      serviceName,
      serviceType,
      vendorName,
      costPrice,
      description = '',
      hoursQty,
      unitPrice,
      isExtraWork,
      technicianId,
      technicianIds
    } = req.body;

    const existingResult = await query(
      'SELECT * FROM job_card_services WHERE id = $1 AND job_card_id = $2',
      [serviceId, id]
    );
    if (existingResult.rows.length === 0) {
      return res.status(404).json({ message: 'Service not found on this Job Card' });
    }

    const current = existingResult.rows[0];
    const qty = hoursQty !== undefined ? (Number(hoursQty) || 1) : Number(current.hours_qty);
    const price = unitPrice !== undefined ? (Number(unitPrice) || 0) : Number(current.unit_price);
    const total = qty * price;
    const finalServiceType = serviceType !== undefined ? serviceType : (current.service_type || 'LABOR');
    const finalVendorName = vendorName !== undefined ? vendorName : current.vendor_name;
    const finalCostPrice = costPrice !== undefined ? Number(costPrice) : current.cost_price;

    let effectiveTechIds: string[] = [];
    if (Array.isArray(technicianIds)) {
      effectiveTechIds = technicianIds.filter(Boolean);
    } else if (technicianId !== undefined) {
      effectiveTechIds = technicianId ? [technicianId] : [];
    } else if (current.technician_ids && Array.isArray(current.technician_ids)) {
      effectiveTechIds = current.technician_ids;
    } else if (current.technician_id) {
      effectiveTechIds = [current.technician_id];
    }

    const primaryTechId = effectiveTechIds.length > 0 ? effectiveTechIds[0] : null;

    const result = await query(`
      UPDATE job_card_services SET
        service_name = COALESCE($1, service_name),
        service_type = $2,
        vendor_name = $3,
        cost_price = $4,
        description = COALESCE($5, description),
        hours_qty = $6,
        unit_price = $7,
        total_price = $8,
        technician_id = $9,
        technician_ids = $10,
        is_extra_work = CASE WHEN $11::boolean IS NOT NULL THEN $11::boolean ELSE is_extra_work END,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $12 AND job_card_id = $13
      RETURNING *
    `, [
      serviceName !== undefined ? serviceName : null,
      finalServiceType,
      finalVendorName,
      finalCostPrice,
      description !== undefined ? description : null,
      qty,
      price,
      total,
      primaryTechId,
      JSON.stringify(effectiveTechIds),
      isExtraWork !== undefined ? Boolean(isExtraWork) : null,
      serviceId,
      id
    ]);

    // Auto-add assigned technicians to workshop team if not already present
    if (effectiveTechIds.length > 0) {
      for (const tId of effectiveTechIds) {
        await query(`
          INSERT INTO job_card_technicians (job_card_id, technician_id, role)
          VALUES ($1, $2, 'TECHNICIAN')
          ON CONFLICT (job_card_id, technician_id) DO NOTHING
        `, [id, tId]);
      }
    }

    const updatedActual = await recalculateJobCardTotals(id);

    res.json({
      message: 'Service updated successfully',
      service: result.rows[0],
      totalAmount: updatedActual
    });
  } catch (error: any) {
    console.error('Update service error:', error);
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

// POST /api/job-cards/:id/spare-parts - Add spare part to job card (Initial Quotation or Extra Material)
router.post('/:id/spare-parts', async (req: AuthRequest, res) => {
  try {
    const {
      id
    } = req.params;
    const {
      sparePartId,
      partName,
      partNumber,
      description = '',
      quantity = 1,
      unit = 'pieces',
      unitPrice = 0,
      isExtraWork = false
    } = req.body;

    const qty = Number(quantity) || 1;
    const price = Number(unitPrice) || 0;
    const total = qty * price;
    const finalIsExtraWork = isExtraWork !== undefined ? Boolean(isExtraWork) : false;

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
      finalIsExtraWork
    ]);

    const updatedActual = await recalculateJobCardTotals(id);

    res.status(201).json({
      message: finalIsExtraWork ? 'Extra spare part added successfully' : 'Spare part added successfully',
      sparePart: result.rows[0],
      totalAmount: updatedActual
    });
  } catch (error: any) {
    console.error('Add spare part to job card error:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
});

// PUT /api/job-cards/:id/spare-parts/:partId - Update spare part in job card
router.put('/:id/spare-parts/:partId', async (req: AuthRequest, res) => {
  try {
    const { id, partId } = req.params;
    const {
      partName,
      partNumber,
      description = '',
      quantity,
      unit,
      unitPrice,
      isExtraWork
    } = req.body;

    const existingResult = await query(
      'SELECT * FROM job_card_spare_parts WHERE id = $1 AND job_card_id = $2',
      [partId, id]
    );
    if (existingResult.rows.length === 0) {
      return res.status(404).json({ message: 'Spare part not found on this Job Card' });
    }

    const current = existingResult.rows[0];
    const qty = quantity !== undefined ? (Number(quantity) || 1) : Number(current.quantity);
    const price = unitPrice !== undefined ? (Number(unitPrice) || 0) : Number(current.unit_price);
    const total = qty * price;

    const result = await query(`
      UPDATE job_card_spare_parts SET
        part_name = COALESCE($1, part_name),
        part_number = COALESCE($2, part_number),
        description = COALESCE($3, description),
        quantity = $4,
        unit = COALESCE($5, unit),
        unit_price = $6,
        total_price = $7,
        is_extra_work = CASE WHEN $8::boolean IS NOT NULL THEN $8::boolean ELSE is_extra_work END,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $9 AND job_card_id = $10
      RETURNING *
    `, [
      partName !== undefined ? partName : null,
      partNumber !== undefined ? partNumber : null,
      description !== undefined ? description : null,
      qty,
      unit !== undefined ? unit : null,
      price,
      total,
      isExtraWork !== undefined ? Boolean(isExtraWork) : null,
      partId,
      id
    ]);

    const updatedActual = await recalculateJobCardTotals(id);

    res.json({
      message: 'Spare part updated successfully',
      sparePart: result.rows[0],
      totalAmount: updatedActual
    });
  } catch (error: any) {
    console.error('Update spare part error:', error);
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

// POST /api/job-cards/:id/revert-invoice
// Revert an invoiced Job Card back to 'IN_PROGRESS' (Repairs in Progress)
// Restores inventory stock used for this bill and voids/deletes the linked bill
router.post('/:id/revert-invoice', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const jcResult = await query('SELECT * FROM job_cards WHERE id = $1', [id]);
    if (jcResult.rows.length === 0) {
      return res.status(404).json({ message: 'Job Card not found' });
    }

    const jobCard = jcResult.rows[0];

    if (jobCard.status !== 'INVOICED' && !jobCard.bill_id) {
      return res.status(400).json({ message: 'Job Card is not in INVOICED status or has no linked bill' });
    }

    const billId = jobCard.bill_id;

    if (billId) {
      // 1. Fetch parts that were deducted for this bill and restore stock
      const billParts = await query('SELECT spare_part_id, quantity FROM bill_spare_parts WHERE bill_id = $1', [billId]);
      for (const bp of billParts.rows) {
        if (bp.spare_part_id && bp.quantity) {
          await query(
            'UPDATE spare_parts SET stock_quantity = stock_quantity + $1 WHERE id = $2',
            [parseFloat(bp.quantity || '0'), bp.spare_part_id]
          );
        }
      }

      // 2. Void/Delete payments, services, parts, and bill
      await query('DELETE FROM payments WHERE bill_id = $1', [billId]);
      await query('DELETE FROM bill_services WHERE bill_id = $1', [billId]);
      await query('DELETE FROM bill_spare_parts WHERE bill_id = $1', [billId]);
      await query('DELETE FROM bills WHERE id = $1', [billId]);
    }

    // 3. Reset job card back to IN_PROGRESS and clear bill_id & actual_delivery_date
    const updatedResult = await query(`
      UPDATE job_cards SET
        status = 'IN_PROGRESS',
        bill_id = NULL,
        actual_delivery_date = NULL,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `, [id]);

    res.json({
      message: 'Job Card successfully reverted back to Vehicle Repairs in Progress! Stock restored and invoice voided.',
      jobCard: updatedResult.rows[0]
    });
  } catch (error: any) {
    console.error('Revert invoice error:', error);
    res.status(500).json({ message: 'Failed to revert invoice', error: error.message });
  }
});

// DELETE /api/job-cards/:id
// Delete a Job Card, voids its bill and restores stock if invoiced, removes linked procurement expenses
router.delete('/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const jcResult = await query('SELECT * FROM job_cards WHERE id = $1', [id]);
    if (jcResult.rows.length === 0) {
      return res.status(404).json({ message: 'Job Card not found' });
    }

    const jobCard = jcResult.rows[0];

    // 1. If invoiced, restore stock and delete bill
    if (jobCard.bill_id) {
      const billParts = await query('SELECT spare_part_id, quantity FROM bill_spare_parts WHERE bill_id = $1', [jobCard.bill_id]);
      for (const bp of billParts.rows) {
        if (bp.spare_part_id && bp.quantity) {
          await query(
            'UPDATE spare_parts SET stock_quantity = stock_quantity + $1 WHERE id = $2',
            [parseFloat(bp.quantity || '0'), bp.spare_part_id]
          );
        }
      }
      await query('DELETE FROM payments WHERE bill_id = $1', [jobCard.bill_id]);
      await query('DELETE FROM bill_services WHERE bill_id = $1', [jobCard.bill_id]);
      await query('DELETE FROM bill_spare_parts WHERE bill_id = $1', [jobCard.bill_id]);
      await query('DELETE FROM bills WHERE id = $1', [jobCard.bill_id]);
    }

    // 2. Clean up any linked procurement expenses in garage_expenses
    const partsWithExp = await query(
      'SELECT procurement_expense_id FROM job_card_spare_parts WHERE job_card_id = $1 AND procurement_expense_id IS NOT NULL',
      [id]
    );
    const servicesWithExp = await query(
      'SELECT procurement_expense_id FROM job_card_services WHERE job_card_id = $1 AND procurement_expense_id IS NOT NULL',
      [id]
    );

    const expenseIds = [
      ...partsWithExp.rows.map(r => r.procurement_expense_id),
      ...servicesWithExp.rows.map(r => r.procurement_expense_id)
    ].filter(Boolean);

    for (const expId of expenseIds) {
      await query('DELETE FROM garage_expenses WHERE id = $1', [expId]);
    }

    // 3. Delete job card relations & job card
    await query('DELETE FROM job_card_technicians WHERE job_card_id = $1', [id]);
    await query('DELETE FROM job_card_spare_parts WHERE job_card_id = $1', [id]);
    await query('DELETE FROM job_card_services WHERE job_card_id = $1', [id]);
    await query('DELETE FROM job_cards WHERE id = $1', [id]);

    res.json({ message: 'Job Card deleted successfully' });
  } catch (error: any) {
    console.error('Delete job card error:', error);
    res.status(500).json({ message: 'Failed to delete Job Card', error: error.message });
  }
});

// POST /api/job-cards/:id/spare-parts/:partId/procure
// Mark spare part as procured and record direct OpEx expense in garage_expenses
router.post('/:id/spare-parts/:partId/procure', async (req: AuthRequest, res) => {
  try {
    const { id, partId } = req.params;
    const {
      procuredCost,
      vendorName = '',
      paymentMethod = 'CASH',
      invoiceRef = '',
      notes = ''
    } = req.body;

    if (!procuredCost || parseFloat(procuredCost) < 0) {
      return res.status(400).json({ message: 'Valid procurement cost is required' });
    }

    const jcRes = await query('SELECT * FROM job_cards WHERE id = $1', [id]);
    if (jcRes.rows.length === 0) return res.status(404).json({ message: 'Job Card not found' });
    const jc = jcRes.rows[0];

    const partRes = await query('SELECT * FROM job_card_spare_parts WHERE id = $1 AND job_card_id = $2', [partId, id]);
    if (partRes.rows.length === 0) return res.status(404).json({ message: 'Spare Part not found on this Job Card' });
    const part = partRes.rows[0];

    // If already procured with an expense, delete the old expense first
    if (part.procurement_expense_id) {
      await query('DELETE FROM garage_expenses WHERE id = $1', [part.procurement_expense_id]);
    }

    const expenseNumber = await generateExpenseNumber();
    const expenseTitle = `Procured Part: ${part.part_name} (${part.quantity} ${part.unit || 'pcs'}) - Job #${jc.job_card_number}`;
    const expenseNotes = notes || `Procurement for Job Card #${jc.job_card_number} (${jc.vehicle_number || ''})`;

    const expInsert = await query(`
      INSERT INTO garage_expenses (
        expense_number, title, category, expense_type, amount,
        expense_date, payment_method, payee_recipient,
        invoice_reference, notes, created_by
      ) VALUES ($1, $2, 'PARTS_PROCUREMENT', 'OPEX', $3, CURRENT_DATE, $4, $5, $6, $7, $8)
      RETURNING *
    `, [
      expenseNumber,
      expenseTitle,
      parseFloat(procuredCost),
      paymentMethod,
      vendorName.trim(),
      invoiceRef.trim(),
      expenseNotes.trim(),
      req.user?.id || null
    ]);

    const createdExpense = expInsert.rows[0];

    const updatedPart = await query(`
      UPDATE job_card_spare_parts SET
        is_procured = true,
        procured_cost = $1,
        procured_at = CURRENT_TIMESTAMP,
        procured_vendor = $2,
        procured_payment_method = $3,
        procured_invoice_ref = $4,
        procurement_expense_id = $5
      WHERE id = $6
      RETURNING *
    `, [
      parseFloat(procuredCost),
      vendorName.trim(),
      paymentMethod,
      invoiceRef.trim(),
      createdExpense.id,
      partId
    ]);

    res.json({
      message: 'Spare part marked as procured and recorded in Financial Ledger',
      part: updatedPart.rows[0],
      expense: createdExpense
    });
  } catch (error: any) {
    console.error('Procure spare part error:', error);
    res.status(500).json({ message: 'Failed to mark spare part as procured', error: error.message });
  }
});

// DELETE /api/job-cards/:id/spare-parts/:partId/procure
// Unmark procurement and delete expense from garage_expenses
router.delete('/:id/spare-parts/:partId/procure', async (req: AuthRequest, res) => {
  try {
    const { id, partId } = req.params;

    const partRes = await query('SELECT * FROM job_card_spare_parts WHERE id = $1 AND job_card_id = $2', [partId, id]);
    if (partRes.rows.length === 0) return res.status(404).json({ message: 'Spare Part not found on this Job Card' });
    const part = partRes.rows[0];

    if (part.procurement_expense_id) {
      await query('DELETE FROM garage_expenses WHERE id = $1', [part.procurement_expense_id]);
    }

    const updatedPart = await query(`
      UPDATE job_card_spare_parts SET
        is_procured = false,
        procured_cost = NULL,
        procured_at = NULL,
        procured_vendor = NULL,
        procured_payment_method = NULL,
        procured_invoice_ref = NULL,
        procurement_expense_id = NULL
      WHERE id = $1
      RETURNING *
    `, [partId]);

    res.json({
      message: 'Procurement unmarked and expense reversed from Financial Ledger',
      part: updatedPart.rows[0]
    });
  } catch (error: any) {
    console.error('Unmark spare part procurement error:', error);
    res.status(500).json({ message: 'Failed to unmark spare part procurement', error: error.message });
  }
});

// POST /api/job-cards/:id/services/:serviceId/procure
// Mark external sublet service as procured / paid to lab and record direct OpEx expense in garage_expenses
router.post('/:id/services/:serviceId/procure', async (req: AuthRequest, res) => {
  try {
    const { id, serviceId } = req.params;
    const {
      procuredCost,
      vendorName = '',
      paymentMethod = 'CASH',
      invoiceRef = '',
      notes = ''
    } = req.body;

    if (!procuredCost || parseFloat(procuredCost) < 0) {
      return res.status(400).json({ message: 'Valid procurement cost is required' });
    }

    const jcRes = await query('SELECT * FROM job_cards WHERE id = $1', [id]);
    if (jcRes.rows.length === 0) return res.status(404).json({ message: 'Job Card not found' });
    const jc = jcRes.rows[0];

    const sRes = await query('SELECT * FROM job_card_services WHERE id = $1 AND job_card_id = $2', [serviceId, id]);
    if (sRes.rows.length === 0) return res.status(404).json({ message: 'Service not found on this Job Card' });
    const service = sRes.rows[0];

    if (service.procurement_expense_id) {
      await query('DELETE FROM garage_expenses WHERE id = $1', [service.procurement_expense_id]);
    }

    const expenseNumber = await generateExpenseNumber();
    const finalVendor = vendorName.trim() || service.vendor_name || 'Sublet Lab';
    const expenseTitle = `Sublet Service: ${service.service_name} (${finalVendor}) - Job #${jc.job_card_number}`;
    const expenseNotes = notes || `External sublet service for Job Card #${jc.job_card_number} (${jc.vehicle_number || ''})`;

    const expInsert = await query(`
      INSERT INTO garage_expenses (
        expense_number, title, category, expense_type, amount,
        expense_date, payment_method, payee_recipient,
        invoice_reference, notes, created_by
      ) VALUES ($1, $2, 'SUBLET_SERVICES', 'OPEX', $3, CURRENT_DATE, $4, $5, $6, $7, $8)
      RETURNING *
    `, [
      expenseNumber,
      expenseTitle,
      parseFloat(procuredCost),
      paymentMethod,
      finalVendor,
      invoiceRef.trim(),
      expenseNotes.trim(),
      req.user?.id || null
    ]);

    const createdExpense = expInsert.rows[0];

    const updatedService = await query(`
      UPDATE job_card_services SET
        is_procured = true,
        procured_cost = $1,
        procured_at = CURRENT_TIMESTAMP,
        procured_vendor = $2,
        procured_payment_method = $3,
        procured_invoice_ref = $4,
        procurement_expense_id = $5
      WHERE id = $6
      RETURNING *
    `, [
      parseFloat(procuredCost),
      finalVendor,
      paymentMethod,
      invoiceRef.trim(),
      createdExpense.id,
      serviceId
    ]);

    res.json({
      message: 'Sublet service marked as procured / paid and recorded in Financial Ledger',
      service: updatedService.rows[0],
      expense: createdExpense
    });
  } catch (error: any) {
    console.error('Procure sublet service error:', error);
    res.status(500).json({ message: 'Failed to mark sublet service as procured', error: error.message });
  }
});

// DELETE /api/job-cards/:id/services/:serviceId/procure
// Unmark sublet service procurement and delete expense from garage_expenses
router.delete('/:id/services/:serviceId/procure', async (req: AuthRequest, res) => {
  try {
    const { id, serviceId } = req.params;

    const sRes = await query('SELECT * FROM job_card_services WHERE id = $1 AND job_card_id = $2', [serviceId, id]);
    if (sRes.rows.length === 0) return res.status(404).json({ message: 'Service not found on this Job Card' });
    const service = sRes.rows[0];

    if (service.procurement_expense_id) {
      await query('DELETE FROM garage_expenses WHERE id = $1', [service.procurement_expense_id]);
    }

    const updatedService = await query(`
      UPDATE job_card_services SET
        is_procured = false,
        procured_cost = NULL,
        procured_at = NULL,
        procured_vendor = NULL,
        procured_payment_method = NULL,
        procured_invoice_ref = NULL,
        procurement_expense_id = NULL
      WHERE id = $1
      RETURNING *
    `, [serviceId]);

    res.json({
      message: 'Sublet service procurement unmarked and expense reversed from Financial Ledger',
      service: updatedService.rows[0]
    });
  } catch (error: any) {
    console.error('Unmark sublet service procurement error:', error);
    res.status(500).json({ message: 'Failed to unmark sublet service procurement', error: error.message });
  }
});

export default router;

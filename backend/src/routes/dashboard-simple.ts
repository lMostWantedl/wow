import express from 'express';
import { query } from '../database/connection';
import { AuthRequest } from '../middleware/auth';

const router = express.Router();

// Get dashboard data
router.get('/', async (req: AuthRequest, res) => {
  try {
    const { user } = req;
    const { period = 'month' } = req.query;

    if (!user) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    let startDate: Date;
    const endDate = new Date();

    // Calculate start date based on period
    switch (period) {
      case 'day':
        startDate = new Date();
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'week':
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'month':
        startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case 'year':
        startDate = new Date();
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      default:
        startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 1);
    }

    let dashboardData: any = {
      period,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      data: {}
    };

    if (user.role === 'CUSTOMER') {
      // Customer dashboard (Row-Level Security)
      const customerResult = await query(
        'SELECT id FROM customers WHERE user_id = $1 OR phone = $2',
        [user.id, user.phone]
      );

      if (customerResult.rows.length > 0) {
        const customerId = customerResult.rows[0].id;

        // Customer bills
        const billsResult = await query(
          `SELECT b.*, u.name as technician_name 
           FROM bills b 
           LEFT JOIN users u ON b.technician_id = u.id 
           WHERE b.customer_id = $1 AND b.service_date >= $2 AND b.service_date <= $3
           ORDER BY b.service_date DESC`,
          [customerId, startDate, endDate]
        );

        // Calculate total spent
        const totalSpentResult = await query(
          'SELECT COALESCE(SUM(total_amount), 0) as total FROM bills WHERE customer_id = $1 AND service_date >= $2 AND service_date <= $3',
          [customerId, startDate, endDate]
        );

        // Customer Job Cards
        const customerJobCardsResult = await query(
          `SELECT 
             jc.id,
             jc.job_card_number,
             jc.status,
             jc.priority,
             jc.estimated_amount,
             jc.actual_amount,
             jc.customer_complaints,
             jc.expected_delivery_date,
             jc.created_at,
             cv.license_plate,
             vm.name as vehicle_make,
             vmod.name as vehicle_model
           FROM job_cards jc
           LEFT JOIN customer_vehicles cv ON jc.vehicle_id = cv.id
           LEFT JOIN vehicle_makes vm ON cv.make_id = vm.id
           LEFT JOIN vehicle_models vmod ON cv.model_id = vmod.id
           WHERE jc.customer_id = $1
           ORDER BY jc.created_at DESC
           LIMIT 6`,
          [customerId]
        );

        const activeJobCardsCount = customerJobCardsResult.rows.filter(
          jc => ['OPEN', 'ESTIMATED', 'IN_PROGRESS'].includes(jc.status)
        ).length;

        dashboardData.data = {
          bills: billsResult.rows,
          totalSpent: parseFloat(totalSpentResult.rows[0]?.total || '0'),
          recentBills: billsResult.rows.slice(0, 5),
          billCount: billsResult.rows.length,
          jobCards: customerJobCardsResult.rows,
          activeJobCardsCount
        };
      } else {
        dashboardData.data = {
          bills: [],
          totalSpent: 0,
          recentBills: [],
          billCount: 0,
          jobCards: [],
          activeJobCardsCount: 0
        };
      }

    } else if (user.role === 'TECHNICIAN') {
      // Technician dashboard
      const billsResult = await query(
        `SELECT b.*, c.name as customer_name 
         FROM bills b 
         LEFT JOIN customers c ON b.customer_id = c.id 
         WHERE b.technician_id = $1 AND b.service_date >= $2 AND b.service_date <= $3
         ORDER BY b.service_date DESC`,
        [user.id, startDate, endDate]
      );

      const revenueResult = await query(
        'SELECT COALESCE(SUM(total_amount), 0) as total FROM bills WHERE technician_id = $1 AND service_date >= $2 AND service_date <= $3',
        [user.id, startDate, endDate]
      );

      // Technician Assigned Job Cards
      let technicianJobCardsResult: any = { rows: [] };
      try {
        technicianJobCardsResult = await query(
          `SELECT DISTINCT
             jc.id,
             jc.job_card_number,
             jc.status,
             jc.priority,
             jc.odometer_reading,
             jc.customer_complaints,
             jc.technician_diagnosis,
             jc.estimated_amount,
             jc.actual_amount,
             jc.expected_delivery_date,
             jc.created_at,
             c.name as customer_name,
             c.phone as customer_phone,
             cv.license_plate,
             vm.name as vehicle_make,
             vmod.name as vehicle_model
           FROM job_cards jc
           LEFT JOIN customers c ON jc.customer_id = c.id
           LEFT JOIN customer_vehicles cv ON jc.vehicle_id = cv.id
           LEFT JOIN vehicle_makes vm ON cv.make_id = vm.id
           LEFT JOIN vehicle_models vmod ON cv.model_id = vmod.id
           WHERE jc.id IN (
             SELECT job_card_id FROM job_card_technicians WHERE technician_id = $1
             UNION
             SELECT job_card_id FROM job_card_services WHERE technician_id = $1 OR technician_ids @> jsonb_build_array($1::text)
           )
           ORDER BY jc.created_at DESC
           LIMIT 10`,
          [user.id]
        );
      } catch (err) {
        console.warn('Error fetching technician job cards:', err);
      }

      const activeTechJobs = technicianJobCardsResult.rows.filter(
        (jc: any) => ['OPEN', 'ESTIMATED', 'IN_PROGRESS'].includes(jc.status)
      ).length;

      const completedTechJobs = technicianJobCardsResult.rows.filter(
        (jc: any) => ['COMPLETED', 'INVOICED'].includes(jc.status)
      ).length;

      dashboardData.data = {
        bills: billsResult.rows,
        technicianRevenue: parseFloat(revenueResult.rows[0]?.total || '0'),
        recentBills: billsResult.rows.slice(0, 5),
        billCount: billsResult.rows.length,
        jobCards: technicianJobCardsResult.rows,
        activeJobCardsCount: activeTechJobs,
        completedJobCardsCount: completedTechJobs
      };

    } else if (user.role === 'MANAGER') {
      // Manager dashboard
      const billsResult = await query(
        `SELECT b.*, c.name as customer_name, u.name as technician_name 
         FROM bills b 
         LEFT JOIN customers c ON b.customer_id = c.id 
         LEFT JOIN users u ON b.technician_id = u.id 
         WHERE b.service_date >= $1 AND b.service_date <= $2
         ORDER BY b.service_date DESC`,
        [startDate, endDate]
      );

      const revenueResult = await query(
        'SELECT COALESCE(SUM(total_amount), 0) as total FROM bills WHERE service_date >= $1 AND service_date <= $2',
        [startDate, endDate]
      );

      const customersResult = await query('SELECT COUNT(*) as count FROM customers');
      const sparePartsResult = await query('SELECT COUNT(*) as count FROM spare_parts WHERE is_active = true');
      const lowStockResult = await query(
        'SELECT * FROM spare_parts WHERE stock_quantity <= min_stock_level AND is_active = true'
      );

      const pendingBillsResult = await query(
        'SELECT COUNT(*) as count FROM bills WHERE status = $1',
        ['PENDING']
      );

      // Job Cards Statistics for Manager
      let totalJobCards = 0;
      let activeJobCardsCount = 0;
      let inProgressJobCardsCount = 0;
      let readyOrEstimatedJobCardsCount = 0;
      let completedJobCardsCount = 0;
      let recentJobCards: any[] = [];

      try {
        const jcStats = await query(`
          SELECT 
            COUNT(*) as total,
            COUNT(*) FILTER (WHERE status IN ('OPEN', 'ESTIMATED', 'IN_PROGRESS')) as active,
            COUNT(*) FILTER (WHERE status = 'IN_PROGRESS') as in_progress,
            COUNT(*) FILTER (WHERE status IN ('ESTIMATED', 'OPEN')) as queue_intake,
            COUNT(*) FILTER (WHERE status IN ('COMPLETED', 'INVOICED')) as completed
          FROM job_cards
        `);

        if (jcStats.rows.length > 0) {
          totalJobCards = parseInt(jcStats.rows[0].total || '0', 10);
          activeJobCardsCount = parseInt(jcStats.rows[0].active || '0', 10);
          inProgressJobCardsCount = parseInt(jcStats.rows[0].in_progress || '0', 10);
          readyOrEstimatedJobCardsCount = parseInt(jcStats.rows[0].queue_intake || '0', 10);
          completedJobCardsCount = parseInt(jcStats.rows[0].completed || '0', 10);
        }

        const recentJcResult = await query(`
          SELECT 
            jc.id,
            jc.job_card_number,
            jc.status,
            jc.priority,
            jc.odometer_reading,
            jc.customer_complaints,
            jc.technician_diagnosis,
            jc.estimated_amount,
            jc.actual_amount,
            jc.expected_delivery_date,
            jc.created_at,
            jc.bill_id,
            c.name as customer_name,
            c.phone as customer_phone,
            cv.license_plate,
            vm.name as vehicle_make,
            vmod.name as vehicle_model,
            COALESCE(
              (SELECT json_agg(json_build_object('id', u.id, 'name', u.name))
               FROM job_card_technicians jct
               JOIN users u ON jct.technician_id = u.id
               WHERE jct.job_card_id = jc.id),
              '[]'::json
            ) as assigned_technicians
          FROM job_cards jc
          LEFT JOIN customers c ON jc.customer_id = c.id
          LEFT JOIN customer_vehicles cv ON jc.vehicle_id = cv.id
          LEFT JOIN vehicle_makes vm ON cv.make_id = vm.id
          LEFT JOIN vehicle_models vmod ON cv.model_id = vmod.id
          ORDER BY jc.created_at DESC
          LIMIT 8
        `);

        recentJobCards = recentJcResult.rows;
      } catch (jcErr) {
        console.warn('Error querying job card statistics:', jcErr);
      }

      // Map database field names to frontend expected field names for low stock items
      const mappedLowStockItems = lowStockResult.rows.map(part => ({
        ...part,
        partNumber: part.part_number,
        stock: part.stock_quantity,
        minStock: part.min_stock_level,
        isActive: part.is_active,
        createdAt: part.created_at,
        updatedAt: part.updated_at
      }));

      dashboardData.data = {
        totalBills: billsResult.rows.length,
        managerRevenue: parseFloat(revenueResult.rows[0]?.total || '0'),
        totalCustomers: parseInt(customersResult.rows[0]?.count || '0', 10),
        totalSpareParts: parseInt(sparePartsResult.rows[0]?.count || '0', 10),
        lowStockItems: mappedLowStockItems,
        pendingBills: parseInt(pendingBillsResult.rows[0]?.count || '0', 10),
        managerRecentBills: billsResult.rows.slice(0, 10),
        monthlyRevenue: [],
        // Job Cards Data
        totalJobCards,
        activeJobCardsCount,
        inProgressJobCardsCount,
        readyOrEstimatedJobCardsCount,
        completedJobCardsCount,
        recentJobCards
      };
    }

    res.json(dashboardData);
  } catch (error) {
    console.error('Get dashboard error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;

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

        // Get customer bills
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

        dashboardData.data = {
          bills: billsResult.rows,
          totalSpent: parseFloat(totalSpentResult.rows[0].total),
          recentBills: billsResult.rows.slice(0, 5),
          billCount: billsResult.rows.length
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

      dashboardData.data = {
        bills: billsResult.rows,
        technicianRevenue: parseFloat(revenueResult.rows[0].total),
        recentBills: billsResult.rows.slice(0, 5),
        billCount: billsResult.rows.length
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
        managerRevenue: parseFloat(revenueResult.rows[0].total),
        totalCustomers: parseInt(customersResult.rows[0].count),
        totalSpareParts: parseInt(sparePartsResult.rows[0].count),
        lowStockItems: mappedLowStockItems,
        pendingBills: parseInt(pendingBillsResult.rows[0].count),
        managerRecentBills: billsResult.rows.slice(0, 10),
        monthlyRevenue: [] // Can be implemented with more complex queries
      };
    }

    res.json(dashboardData);
  } catch (error) {
    console.error('Get dashboard error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;

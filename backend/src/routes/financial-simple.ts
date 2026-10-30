import express from 'express';
import { query } from '../database/connection';
import { AuthRequest, requireRoleOrScope } from '../middleware/auth';

const router = express.Router();

// Generate sequential expense number EXP-YYYYMM-XXXX
const generateExpenseNumber = async (): Promise<string> => {
  const date = new Date();
  const yearMonth = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`;
  const prefix = `EXP-${yearMonth}-`;
  
  const countResult = await query(
    "SELECT COUNT(*) as count FROM garage_expenses WHERE expense_number LIKE $1",
    [`${prefix}%`]
  );
  
  const nextSeq = parseInt(countResult.rows[0]?.count || '0', 10) + 1;
  return `${prefix}${String(nextSeq).padStart(4, '0')}`;
};

// ============================================================================
// 1. COMPREHENSIVE FINANCIAL OVERVIEW REPORT
// ============================================================================
router.get('/report', requireRoleOrScope(['MANAGER'], 'financial'), async (req: AuthRequest, res) => {
  try {
    const { period = 'month', startDate: customStart, endDate: customEnd } = req.query;

    let startDate: Date;
    let endDate: Date;

    if (customStart && customEnd) {
      startDate = new Date(customStart as string);
      endDate = new Date(customEnd as string);
      endDate.setHours(23, 59, 59, 999);
    } else {
      endDate = new Date();
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
    }

    // 1. Revenue from bills
    const revenueResult = await query(
      'SELECT COALESCE(SUM(total_amount), 0) as total_revenue, COALESCE(SUM(paid_amount), 0) as paid_revenue, COUNT(*) as bill_count FROM bills WHERE service_date >= $1 AND service_date <= $2',
      [startDate, endDate]
    );

    // 2. Revenue breakdown: Labor vs Spare Parts
    const laborRevResult = await query(
      `SELECT COALESCE(SUM(bs.total_price), 0) as labor_revenue 
       FROM bill_services bs 
       JOIN bills b ON bs.bill_id = b.id 
       WHERE b.service_date >= $1 AND b.service_date <= $2`,
      [startDate, endDate]
    );

    const partsRevResult = await query(
      `SELECT COALESCE(SUM(bsp.total_price), 0) as parts_revenue 
       FROM bill_spare_parts bsp 
       JOIN bills b ON bsp.bill_id = b.id 
       WHERE b.service_date >= $1 AND b.service_date <= $2`,
      [startDate, endDate]
    );

    // 3. Cost of Goods Sold (Spare parts cost)
    const costResult = await query(
      `SELECT COALESCE(SUM(bsp.quantity * sp.cost), 0) as total_cogs
       FROM bill_spare_parts bsp
       JOIN spare_parts sp ON bsp.spare_part_id = sp.id
       JOIN bills b ON bsp.bill_id = b.id
       WHERE b.service_date >= $1 AND b.service_date <= $2`,
      [startDate, endDate]
    );

    // 4. Pending receivables
    const pendingResult = await query(
      `SELECT COALESCE(SUM(total_amount - paid_amount), 0) as pending_amount 
       FROM bills 
       WHERE service_date >= $1 AND service_date <= $2 AND payment_status != 'PAID'`,
      [startDate, endDate]
    );

    // 5. Operating Expenses (OpEx) during period
    const opexResult = await query(
      `SELECT COALESCE(SUM(amount), 0) as total_opex 
       FROM garage_expenses 
       WHERE expense_type = 'OPEX' AND expense_date >= $1 AND expense_date <= $2`,
      [startDate, endDate]
    );

    // 6. Capital Expenditures (CapEx: Setup, Lifts, Tools, Machinery)
    const capexResult = await query(
      `SELECT COALESCE(SUM(amount), 0) as total_capex 
       FROM garage_expenses 
       WHERE expense_type = 'CAPEX' AND expense_date >= $1 AND expense_date <= $2`,
      [startDate, endDate]
    );

    // All-time CapEx (Total garage setup & equipment asset value)
    const allTimeCapexResult = await query(
      `SELECT COALESCE(SUM(amount), 0) as all_time_capex 
       FROM garage_expenses 
       WHERE expense_type = 'CAPEX'`
    );

    // All-time Capital & Owner Investments Injected
    const allTimeInvestmentsResult = await query(
      'SELECT COALESCE(SUM(amount), 0) as all_time_investments FROM garage_investments'
    );
    const allTimeInvestments = parseFloat(allTimeInvestmentsResult.rows[0].all_time_investments) || 0;

    // 7. Expenses categorized breakdown during period
    const categoryExpensesResult = await query(
      `SELECT category, expense_type, COUNT(*) as count, COALESCE(SUM(amount), 0) as amount
       FROM garage_expenses
       WHERE expense_date >= $1 AND expense_date <= $2
       GROUP BY category, expense_type
       ORDER BY amount DESC`,
      [startDate, endDate]
    );

    // 8. Payment Status breakdown for bills
    const paymentStatusResult = await query(
      `SELECT payment_status, COUNT(*) as count, COALESCE(SUM(total_amount), 0) as amount
       FROM bills 
       WHERE service_date >= $1 AND service_date <= $2
       GROUP BY payment_status`,
      [startDate, endDate]
    );

    // 9. Monthly financial trends (past 6 months)
    const trendsResult = await query(
      `SELECT 
         to_char(months.m, 'Mon YYYY') as month_label,
         date_trunc('month', months.m) as month_date,
         COALESCE(rev.monthly_rev, 0) as revenue,
         COALESCE(cogs.monthly_cogs, 0) as cogs,
         COALESCE(exp.monthly_opex, 0) as opex
       FROM generate_series(
         date_trunc('month', CURRENT_DATE) - interval '5 months',
         date_trunc('month', CURRENT_DATE),
         interval '1 month'
       ) as months(m)
       LEFT JOIN (
         SELECT date_trunc('month', service_date) as m, SUM(total_amount) as monthly_rev
         FROM bills
         GROUP BY 1
       ) rev ON rev.m = months.m
       LEFT JOIN (
         SELECT date_trunc('month', b.service_date) as m, SUM(bsp.quantity * sp.cost) as monthly_cogs
         FROM bill_spare_parts bsp
         JOIN spare_parts sp ON bsp.spare_part_id = sp.id
         JOIN bills b ON bsp.bill_id = b.id
         GROUP BY 1
       ) cogs ON cogs.m = months.m
       LEFT JOIN (
         SELECT date_trunc('month', expense_date) as m, SUM(amount) as monthly_opex
         FROM garage_expenses
         WHERE expense_type = 'OPEX'
         GROUP BY 1
       ) exp ON exp.m = months.m
       ORDER BY months.m ASC`
    );

    const totalRevenue = parseFloat(revenueResult.rows[0].total_revenue) || 0;
    const laborRevenue = parseFloat(laborRevResult.rows[0].labor_revenue) || 0;
    const partsRevenue = parseFloat(partsRevResult.rows[0].parts_revenue) || 0;
    const totalCogs = parseFloat(costResult.rows[0].total_cogs) || 0;
    const grossProfit = totalRevenue - totalCogs;
    const grossProfitMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

    const totalOpex = parseFloat(opexResult.rows[0].total_opex) || 0;
    const totalCapex = parseFloat(capexResult.rows[0].total_capex) || 0;
    const allTimeCapex = parseFloat(allTimeCapexResult.rows[0].all_time_capex) || 0;

    // True Net Operating Profit = Gross Profit - Operating Expenses
    const netProfit = grossProfit - totalOpex;
    const netProfitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

    const monthlyTrends = trendsResult.rows.map(r => {
      const rRev = parseFloat(r.revenue) || 0;
      const rCogs = parseFloat(r.cogs) || 0;
      const rOpex = parseFloat(r.opex) || 0;
      const rGross = rRev - rCogs;
      const rNet = rGross - rOpex;
      return {
        month: r.month_label,
        revenue: rRev,
        cogs: rCogs,
        opex: rOpex,
        grossProfit: rGross,
        netProfit: rNet
      };
    });

    res.json({
      period,
      dateRange: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      },
      summary: {
        totalRevenue,
        laborRevenue,
        partsRevenue,
        totalCosts: totalCogs + totalOpex,
        cogs: totalCogs,
        opex: totalOpex,
        capex: totalCapex,
        allTimeCapex,
        allTimeInvestments,
        netWorkingCapital: allTimeInvestments + totalRevenue - (totalCogs + totalOpex + allTimeCapex),
        grossProfit,
        grossProfitMargin,
        netProfit,
        netProfitMargin,
        totalBills: parseInt(revenueResult.rows[0].bill_count, 10) || 0,
        paidRevenue: parseFloat(revenueResult.rows[0].paid_revenue) || 0,
        pendingPayments: parseFloat(pendingResult.rows[0].pending_amount) || 0
      },
      expenseCategories: categoryExpensesResult.rows.map(r => ({
        category: r.category,
        expenseType: r.expense_type,
        count: parseInt(r.count, 10),
        amount: parseFloat(r.amount)
      })),
      monthlyTrends,
      billsByStatus: paymentStatusResult.rows.map(row => ({
        status: row.payment_status,
        count: parseInt(row.count, 10),
        amount: parseFloat(row.amount)
      })),
      paymentsByStatus: paymentStatusResult.rows.map(row => ({
        status: row.payment_status,
        count: parseInt(row.count, 10),
        totalAmount: parseFloat(row.amount),
        paidAmount: row.payment_status === 'PAID' ? parseFloat(row.amount) : 0
      }))
    });
  } catch (error: any) {
    console.error('Get financial report error:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
});

// ============================================================================
// 2. PROFIT AND LOSS DETAILED BREAKDOWN
// ============================================================================
router.get('/profit-loss', requireRoleOrScope(['MANAGER'], 'financial'), async (req: AuthRequest, res) => {
  try {
    const { startDate, endDate } = req.query;

    const start = startDate ? new Date(startDate as string) : new Date(new Date().setMonth(new Date().getMonth() - 1));
    const end = endDate ? new Date(endDate as string) : new Date();

    // 1. Revenue
    const revResult = await query(
      `SELECT 
         COALESCE(SUM(total_amount), 0) as total_rev,
         COALESCE(SUM(paid_amount), 0) as collected_rev
       FROM bills 
       WHERE service_date >= $1 AND service_date <= $2`,
      [start, end]
    );

    const laborRev = await query(
      `SELECT COALESCE(SUM(bs.total_price), 0) as total FROM bill_services bs JOIN bills b ON bs.bill_id = b.id WHERE b.service_date >= $1 AND b.service_date <= $2`,
      [start, end]
    );

    const partsRev = await query(
      `SELECT COALESCE(SUM(bsp.total_price), 0) as total FROM bill_spare_parts bsp JOIN bills b ON bsp.bill_id = b.id WHERE b.service_date >= $1 AND b.service_date <= $2`,
      [start, end]
    );

    // 2. COGS (Parts Cost)
    const cogsResult = await query(
      `SELECT COALESCE(SUM(bsp.quantity * sp.cost), 0) as total
       FROM bill_spare_parts bsp
       JOIN spare_parts sp ON bsp.spare_part_id = sp.id
       JOIN bills b ON bsp.bill_id = b.id
       WHERE b.service_date >= $1 AND b.service_date <= $2`,
      [start, end]
    );

    // 3. Operating Expenses grouped by Category
    const expResult = await query(
      `SELECT category, COALESCE(SUM(amount), 0) as amount
       FROM garage_expenses
       WHERE expense_type = 'OPEX' AND expense_date >= $1 AND expense_date <= $2
       GROUP BY category`,
      [start, end]
    );

    const expensesByCategory: Record<string, number> = {};
    let totalOpex = 0;
    for (const r of expResult.rows) {
      const amt = parseFloat(r.amount) || 0;
      expensesByCategory[r.category] = amt;
      totalOpex += amt;
    }

    const totalRevenue = parseFloat(revResult.rows[0].total_rev) || 0;
    const serviceRevenue = parseFloat(laborRev.rows[0].total) || 0;
    const sparePartRevenue = parseFloat(partsRev.rows[0].total) || 0;
    const sparePartCosts = parseFloat(cogsResult.rows[0].total) || 0;

    const grossProfit = totalRevenue - sparePartCosts;
    const grossProfitMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

    const netProfit = grossProfit - totalOpex;
    const netProfitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

    res.json({
      period: {
        startDate: start.toISOString(),
        endDate: end.toISOString()
      },
      income: {
        totalRevenue,
        serviceRevenue,
        sparePartRevenue
      },
      costs: {
        sparePartCosts,
        rent: expensesByCategory['RENT'] || 0,
        salaries: expensesByCategory['SALARY'] || 0,
        toolsEquipment: expensesByCategory['TOOLS_EQUIPMENT'] || 0,
        utilities: expensesByCategory['UTILITIES'] || 0,
        consumables: expensesByCategory['CONSUMABLES'] || 0,
        maintenance: expensesByCategory['MAINTENANCE'] || 0,
        marketing: expensesByCategory['MARKETING'] || 0,
        insuranceTax: expensesByCategory['INSURANCE_TAX'] || 0,
        miscellaneous: expensesByCategory['MISCELLANEOUS'] || 0,
        totalOpex
      },
      profit: {
        grossProfit,
        grossProfitMargin,
        netProfit,
        netProfitMargin
      }
    });
  } catch (error: any) {
    console.error('Get P&L error:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
});

// ============================================================================
// 3. DAILY FINANCIAL SUMMARY
// ============================================================================
router.get('/daily', requireRoleOrScope(['MANAGER'], 'financial'), async (req: AuthRequest, res) => {
  try {
    const { date } = req.query;
    const targetDate = date ? new Date(date as string) : new Date();
    
    const revenueResult = await query(
      'SELECT COALESCE(SUM(total_amount), 0) as total_revenue, COUNT(*) as count FROM bills WHERE DATE(service_date) = $1',
      [targetDate]
    );

    const paymentsResult = await query(
      'SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as total FROM payments WHERE DATE(created_at) = $1',
      [targetDate]
    );

    const expenseResult = await query(
      'SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as total FROM garage_expenses WHERE DATE(expense_date) = $1',
      [targetDate]
    );

    res.json({
      date: targetDate.toISOString().split('T')[0],
      summary: {
        totalRevenue: parseFloat(revenueResult.rows[0].total_revenue) || 0,
        totalBills: parseInt(revenueResult.rows[0].count, 10) || 0,
        totalPayments: parseInt(paymentsResult.rows[0].count, 10) || 0,
        paymentsCollected: parseFloat(paymentsResult.rows[0].total) || 0,
        dailyExpenses: parseFloat(expenseResult.rows[0].total) || 0
      }
    });
  } catch (error: any) {
    console.error('Get daily financial error:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
});

// ============================================================================
// 4. GARAGE EXPENSES LIST (WITH SEARCH, CATEGORY, TYPE & DATE FILTERS)
// ============================================================================
router.get('/expenses', requireRoleOrScope(['MANAGER'], 'financial'), async (req: AuthRequest, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit as string) || 15));
    const offset = (page - 1) * limit;

    const {
      search = '',
      category = 'ALL',
      expenseType = 'ALL',
      startDate,
      endDate
    } = req.query;

    let queryText = `
      SELECT ge.*, u.name as staff_name, u.role as staff_role
      FROM garage_expenses ge
      LEFT JOIN users u ON ge.user_id = u.id
      WHERE 1=1
    `;
    const queryParams: any[] = [];
    let paramIndex = 1;

    if (category && category !== 'ALL') {
      queryText += ` AND ge.category = $${paramIndex}`;
      queryParams.push(category);
      paramIndex++;
    }

    if (expenseType && expenseType !== 'ALL') {
      queryText += ` AND ge.expense_type = $${paramIndex}`;
      queryParams.push(expenseType);
      paramIndex++;
    }

    if (startDate) {
      queryText += ` AND ge.expense_date >= $${paramIndex}`;
      queryParams.push(startDate);
      paramIndex++;
    }

    if (endDate) {
      queryText += ` AND ge.expense_date <= $${paramIndex}`;
      queryParams.push(endDate);
      paramIndex++;
    }

    if (search) {
      queryText += ` AND (
        ge.expense_number ILIKE $${paramIndex} OR
        ge.title ILIKE $${paramIndex} OR
        ge.payee_recipient ILIKE $${paramIndex} OR
        ge.invoice_reference ILIKE $${paramIndex}
      )`;
      queryParams.push(`%${search}%`);
      paramIndex++;
    }

    // Totals query before pagination
    const totalResult = await query(
      `SELECT 
         COUNT(*) as total_count,
         COALESCE(SUM(amount), 0) as total_amount,
         COALESCE(SUM(CASE WHEN expense_type = 'OPEX' THEN amount ELSE 0 END), 0) as opex_amount,
         COALESCE(SUM(CASE WHEN expense_type = 'CAPEX' THEN amount ELSE 0 END), 0) as capex_amount
       FROM garage_expenses ge
       WHERE 1=1 ${queryText.split('WHERE 1=1')[1]}`,
      queryParams
    );

    queryText += ` ORDER BY ge.expense_date DESC, ge.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    queryParams.push(limit, offset);

    const result = await query(queryText, queryParams);

    const totalCount = parseInt(totalResult.rows[0]?.total_count || '0', 10);
    const pages = Math.ceil(totalCount / limit) || 1;

    res.json({
      expenses: result.rows,
      totals: {
        count: totalCount,
        totalAmount: parseFloat(totalResult.rows[0]?.total_amount || '0'),
        opexAmount: parseFloat(totalResult.rows[0]?.opex_amount || '0'),
        capexAmount: parseFloat(totalResult.rows[0]?.capex_amount || '0')
      },
      pagination: {
        page,
        limit,
        total: totalCount,
        pages
      }
    });
  } catch (error: any) {
    console.error('Get expenses error:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
});

// ============================================================================
// 5. CREATE EXPENSE RECORD
// ============================================================================
router.post('/expenses', requireRoleOrScope(['MANAGER'], 'financial'), async (req: AuthRequest, res) => {
  try {
    const {
      title,
      category,
      expenseType = 'OPEX',
      amount,
      expenseDate = new Date().toISOString().split('T')[0],
      paymentMethod = 'CASH',
      payeeRecipient = '',
      userId,
      invoiceReference = '',
      notes = '',
      isRecurring = false,
      recurringFrequency
    } = req.body;

    if (!title || !category || !amount || parseFloat(amount) <= 0) {
      return res.status(400).json({ message: 'Title, category, and a valid positive amount are required' });
    }

    const expenseNumber = await generateExpenseNumber();

    const insertResult = await query(`
      INSERT INTO garage_expenses (
        expense_number, title, category, expense_type, amount,
        expense_date, payment_method, payee_recipient, user_id,
        invoice_reference, notes, is_recurring, recurring_frequency, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *
    `, [
      expenseNumber,
      title.trim(),
      category,
      expenseType,
      parseFloat(amount),
      expenseDate,
      paymentMethod,
      payeeRecipient.trim(),
      userId || null,
      invoiceReference.trim(),
      notes.trim(),
      Boolean(isRecurring),
      recurringFrequency || null,
      req.user?.id || null
    ]);

    res.status(201).json({
      message: 'Expense recorded successfully',
      expense: insertResult.rows[0]
    });
  } catch (error: any) {
    console.error('Create expense error:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
});

// ============================================================================
// 6. UPDATE EXPENSE RECORD
// ============================================================================
router.put('/expenses/:id', requireRoleOrScope(['MANAGER'], 'financial'), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      category,
      expenseType,
      amount,
      expenseDate,
      paymentMethod,
      payeeRecipient,
      userId,
      invoiceReference,
      notes,
      isRecurring,
      recurringFrequency
    } = req.body;

    const check = await query('SELECT * FROM garage_expenses WHERE id = $1', [id]);
    if (check.rows.length === 0) {
      return res.status(404).json({ message: 'Expense record not found' });
    }

    const updated = await query(`
      UPDATE garage_expenses
      SET title = COALESCE($1, title),
          category = COALESCE($2, category),
          expense_type = COALESCE($3, expense_type),
          amount = COALESCE($4, amount),
          expense_date = COALESCE($5, expense_date),
          payment_method = COALESCE($6, payment_method),
          payee_recipient = COALESCE($7, payee_recipient),
          user_id = $8,
          invoice_reference = COALESCE($9, invoice_reference),
          notes = COALESCE($10, notes),
          is_recurring = COALESCE($11, is_recurring),
          recurring_frequency = $12,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $13
      RETURNING *
    `, [
      title ? title.trim() : null,
      category,
      expenseType,
      amount ? parseFloat(amount) : null,
      expenseDate,
      paymentMethod,
      payeeRecipient ? payeeRecipient.trim() : null,
      userId !== undefined ? (userId || null) : check.rows[0].user_id,
      invoiceReference !== undefined ? invoiceReference : check.rows[0].invoice_reference,
      notes !== undefined ? notes : check.rows[0].notes,
      isRecurring !== undefined ? Boolean(isRecurring) : check.rows[0].is_recurring,
      recurringFrequency !== undefined ? recurringFrequency : check.rows[0].recurring_frequency,
      id
    ]);

    res.json({
      message: 'Expense updated successfully',
      expense: updated.rows[0]
    });
  } catch (error: any) {
    console.error('Update expense error:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
});

// ============================================================================
// 7. DELETE EXPENSE RECORD
// ============================================================================
router.delete('/expenses/:id', requireRoleOrScope(['MANAGER'], 'financial'), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const result = await query('DELETE FROM garage_expenses WHERE id = $1 RETURNING id, expense_number', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Expense record not found' });
    }
    res.json({ message: 'Expense deleted successfully', deletedId: id });
  } catch (error: any) {
    console.error('Delete expense error:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
});

// ============================================================================
// 8. STAFF SALARIES & PAYROLL SUMMARY
// ============================================================================
router.get('/salaries', requireRoleOrScope(['MANAGER'], 'financial'), async (req: AuthRequest, res) => {
  try {
    const { year = new Date().getFullYear() } = req.query;

    const staffSummary = await query(`
      SELECT 
        u.id as user_id,
        u.name as staff_name,
        u.role as staff_role,
        u.phone as staff_phone,
        COALESCE(u.base_salary, 0) as base_salary,
        COUNT(ge.id) as payment_count,
        COALESCE(SUM(ge.amount), 0) as total_salary_paid,
        MAX(ge.expense_date) as last_paid_date
      FROM users u
      LEFT JOIN garage_expenses ge ON (ge.user_id = u.id AND ge.category = 'SALARY' AND EXTRACT(YEAR FROM ge.expense_date) = $1)
      WHERE u.role IN ('MANAGER', 'TECHNICIAN')
      GROUP BY u.id, u.name, u.role, u.phone, u.base_salary
      ORDER BY total_salary_paid DESC, u.name ASC
    `, [year]);

    const recentSalaries = await query(`
      SELECT ge.*, u.name as staff_name, u.role as staff_role
      FROM garage_expenses ge
      LEFT JOIN users u ON ge.user_id = u.id
      WHERE ge.category = 'SALARY'
      ORDER BY ge.expense_date DESC
      LIMIT 20
    `);

    const totalSalaryYear = staffSummary.rows.reduce((sum, s) => sum + parseFloat(s.total_salary_paid || '0'), 0);

    res.json({
      year,
      totalSalaryPaidYear: totalSalaryYear,
      staffSummary: staffSummary.rows,
      recentSalaries: recentSalaries.rows
    });
  } catch (error: any) {
    console.error('Get salaries error:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
});

// Update employee base monthly salary
router.put('/staff-salary/:userId', requireRoleOrScope(['MANAGER'], 'financial'), async (req: AuthRequest, res) => {
  try {
    const { userId } = req.params;
    const { baseSalary } = req.body;

    const parsedSalary = parseFloat(baseSalary);
    if (isNaN(parsedSalary) || parsedSalary < 0) {
      return res.status(400).json({ message: 'Invalid salary amount' });
    }

    const result = await query(
      'UPDATE users SET base_salary = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id, name, role, phone, base_salary',
      [parsedSalary, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Staff member not found' });
    }

    res.json({
      message: 'Base salary updated successfully',
      staff: result.rows[0]
    });
  } catch (error: any) {
    console.error('Update staff salary error:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
});

// ============================================================================
// 9. GARAGE CAPITAL & OWNER INVESTMENTS
// ============================================================================

// Get all investments & capital summary
router.get('/investments', requireRoleOrScope(['MANAGER'], 'financial'), async (req: AuthRequest, res) => {
  try {
    const result = await query(`
      SELECT 
        gi.*,
        u.name as creator_name
      FROM garage_investments gi
      LEFT JOIN users u ON gi.created_by = u.id
      ORDER BY gi.investment_date DESC, gi.created_at DESC
    `);

    const totalInvested = result.rows.reduce((sum, inv) => sum + parseFloat(inv.amount || '0'), 0);

    const byType: Record<string, number> = {
      INITIAL_CAPITAL: 0,
      PARTNER_EQUITY: 0,
      WORKING_CAPITAL: 0,
      LOAN_DEBT: 0
    };

    for (const r of result.rows) {
      const t = r.investment_type || 'INITIAL_CAPITAL';
      byType[t] = (byType[t] || 0) + parseFloat(r.amount || '0');
    }

    res.json({
      investments: result.rows,
      totalInvested,
      byType
    });
  } catch (error: any) {
    console.error('Get investments error:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
});

// Create new capital investment
router.post('/investments', requireRoleOrScope(['MANAGER'], 'financial'), async (req: AuthRequest, res) => {
  try {
    const {
      investorName,
      investmentType = 'INITIAL_CAPITAL',
      amount,
      investmentDate = new Date().toISOString().split('T')[0],
      paymentMethod = 'BANK_TRANSFER',
      referenceNumber,
      notes
    } = req.body;

    if (!investorName || !investorName.trim()) {
      return res.status(400).json({ message: 'Investor/Contributor name is required' });
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ message: 'Valid positive investment amount is required' });
    }

    // Generate investment number: INV-YYYY-XXXX
    const year = new Date(investmentDate).getFullYear() || new Date().getFullYear();
    const countResult = await query(
      'SELECT COUNT(*) as count FROM garage_investments WHERE EXTRACT(YEAR FROM investment_date) = $1',
      [year]
    );
    const nextNum = (parseInt(countResult.rows[0].count, 10) + 1).toString().padStart(4, '0');
    const investmentNumber = `INV-${year}-${nextNum}`;

    const insertResult = await query(
      `INSERT INTO garage_investments (
        investment_number, investor_name, investment_type, amount, investment_date, payment_method, reference_number, notes, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [
        investmentNumber,
        investorName.trim(),
        investmentType,
        parsedAmount,
        investmentDate,
        paymentMethod,
        referenceNumber ? referenceNumber.trim() : null,
        notes ? notes.trim() : null,
        req.user?.id || null
      ]
    );

    res.status(201).json({
      message: 'Capital investment recorded successfully',
      investment: insertResult.rows[0]
    });
  } catch (error: any) {
    console.error('Create investment error:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
});

// Update investment
router.put('/investments/:id', requireRoleOrScope(['MANAGER'], 'financial'), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const {
      investorName,
      investmentType,
      amount,
      investmentDate,
      paymentMethod,
      referenceNumber,
      notes
    } = req.body;

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ message: 'Valid positive investment amount is required' });
    }

    const updateResult = await query(
      `UPDATE garage_investments
       SET investor_name = $1,
           investment_type = $2,
           amount = $3,
           investment_date = $4,
           payment_method = $5,
           reference_number = $6,
           notes = $7,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $8
       RETURNING *`,
      [
        investorName.trim(),
        investmentType,
        parsedAmount,
        investmentDate,
        paymentMethod,
        referenceNumber ? referenceNumber.trim() : null,
        notes ? notes.trim() : null,
        id
      ]
    );

    if (updateResult.rows.length === 0) {
      return res.status(404).json({ message: 'Investment not found' });
    }

    res.json({
      message: 'Investment record updated successfully',
      investment: updateResult.rows[0]
    });
  } catch (error: any) {
    console.error('Update investment error:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
});

// Delete investment
router.delete('/investments/:id', requireRoleOrScope(['MANAGER'], 'financial'), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const deleteResult = await query('DELETE FROM garage_investments WHERE id = $1 RETURNING id', [id]);
    if (deleteResult.rows.length === 0) {
      return res.status(404).json({ message: 'Investment not found' });
    }
    res.json({ message: 'Investment record deleted successfully', deletedId: id });
  } catch (error: any) {
    console.error('Delete investment error:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
});

export default router;

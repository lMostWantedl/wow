export interface User {
  id: string;
  name: string;
  phone: string;
  email?: string;
  role: 'CUSTOMER' | 'TECHNICIAN' | 'MANAGER';
  scopes?: string[];
  baseSalary?: number;
  base_salary?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerVehicle {
  id: string;
  makeId?: string;
  modelId?: string;
  variantId?: string;
  colorId?: string;
  licensePlate?: string;
  vin?: string;
  year?: number;
  isPrimary: boolean;
  makeName?: string;
  modelName?: string;
  variantName?: string;
  colorName?: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  vehicles?: CustomerVehicle[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  bill_count?: number;
}

export interface SparePart {
  id: string;
  name: string;
  partNumber: string;
  description?: string;
  category: string;
  price: number;
  cost: number;
  stock: number;
  minStock: number;
  unit: string;
  unitType: 'discrete' | 'liquid' | 'weight';
  supplier?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Service {
  id: string;
  name: string;
  description?: string;
  price: number;
  duration: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BillItem {
  id: string;
  billId: string;
  sparePartId?: string;
  serviceId?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  createdAt: string;
  sparePart?: SparePart;
  service?: Service;
}

export interface Payment {
  id: string;
  billId: string;
  amount: number;
  paymentDate: string;
  paymentMethod: string;
  reference?: string;
  notes?: string;
  createdAt: string;
}

export interface Bill {
  id: string;
  billNumber: string;
  customerId: string;
  customerUserId?: string;
  technicianId?: string;
  vehicleId?: string;
  createdById: string;
  status: 'PENDING' | 'COMPLETED' | 'PAID' | 'CANCELLED';
  paymentStatus: 'PENDING' | 'PAID' | 'PARTIAL' | 'OVERDUE';
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  paidAmount: number;
  vehicleNumber?: string;
  vehicleModel?: string;
  vehicleYear?: number;
  vehicleVin?: string;
  serviceDate: string;
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
  customer: Customer;
  customerUser?: User;
  technician?: User;
  createdBy: User;
  items: BillItem[];
  payments: Payment[];
}

// Interface for bills list response (matches backend snake_case response)
export interface BillListItem {
  id: string;
  bill_number: string;
  customer_id: string;
  technician_id?: string;
  vehicle_id?: string;
  status: 'PENDING' | 'COMPLETED' | 'PAID' | 'CANCELLED';
  payment_status: 'PENDING' | 'PAID' | 'PARTIAL' | 'OVERDUE';
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  paid_amount: number;
  service_date: string;
  created_at: string;
  updated_at: string;
  customer_name: string;
  technician_name?: string;
  vehicle_number?: string;
  vehicle_model?: string;
  vehicle_year?: number;
  vehicle_vin?: string;
}

// Interface for bill details response (matches backend snake_case response)
export interface BillDetailsItem {
  id: string;
  bill_number: string;
  customer_id: string;
  technician_id?: string;
  vehicle_id?: string;
  status: 'PENDING' | 'COMPLETED' | 'PAID' | 'CANCELLED';
  payment_status: 'PENDING' | 'PAID' | 'PARTIAL' | 'OVERDUE';
  subtotal: number;
  tax_amount: number;
  tax_rate: number;
  discount_amount: number;
  total_amount: number;
  paid_amount: number;
  service_date: string;
  created_at: string;
  updated_at: string;
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  customer_address?: string;
  technician_name?: string;
  technician_phone?: string;
  vehicle_number?: string;
  vehicle_model?: string;
  vehicle_year?: number;
  vehicle_vin?: string;
  services?: any[];
  spareParts?: any[];
  payments?: any[];
}

export interface RegisterData {
  name: string;
  phone: string;
  email: string;
  password: string;
  role: 'CUSTOMER' | 'TECHNICIAN' | 'MANAGER';
}

export interface AuthContextType {
  user: User | null;
  login: (emailOrPhone: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

export interface DashboardData {
  period: string;
  startDate: string;
  endDate: string;
  data: {
    // Customer dashboard
    bills?: Bill[];
    totalSpent?: number;
    recentBills?: Bill[];
    billCount?: number;
    
    // Technician dashboard
    technicianRevenue?: number;
    
    // Manager dashboard
    totalBills?: number;
    managerRevenue?: number;
    totalCustomers?: number;
    totalSpareParts?: number;
    lowStockItems?: SparePart[];
    pendingBills?: number;
    managerRecentBills?: Bill[];
    monthlyRevenue?: any[];
  };
}

export type ExpenseCategory =
  | 'GARAGE_SETUP'
  | 'RENT'
  | 'SALARY'
  | 'TOOLS_EQUIPMENT'
  | 'UTILITIES'
  | 'CONSUMABLES'
  | 'MAINTENANCE'
  | 'MARKETING'
  | 'INSURANCE_TAX'
  | 'MISCELLANEOUS';

export type ExpenseType = 'OPEX' | 'CAPEX';

export type ExpensePaymentMethod = 'CASH' | 'BANK_TRANSFER' | 'UPI' | 'CARD' | 'CHEQUE';

export type InvestmentType = 'INITIAL_CAPITAL' | 'PARTNER_EQUITY' | 'WORKING_CAPITAL' | 'LOAN_DEBT';

export interface GarageInvestment {
  id: string;
  investment_number: string;
  investor_name: string;
  investment_type: InvestmentType;
  amount: number;
  investment_date: string;
  payment_method: ExpensePaymentMethod;
  reference_number?: string;
  notes?: string;
  creator_name?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateInvestmentData {
  investorName: string;
  investmentType: InvestmentType;
  amount: number;
  investmentDate: string;
  paymentMethod: ExpensePaymentMethod;
  referenceNumber?: string;
  notes?: string;
}

export interface InvestmentsResponse {
  investments: GarageInvestment[];
  totalInvested: number;
  byType: Record<InvestmentType, number>;
}

export interface GarageExpense {
  id: string;
  expense_number: string;
  title: string;
  category: ExpenseCategory;
  expense_type: ExpenseType;
  amount: number;
  expense_date: string;
  payment_method: ExpensePaymentMethod;
  payee_recipient?: string;
  user_id?: string;
  staff_name?: string;
  staff_role?: string;
  invoice_reference?: string;
  notes?: string;
  is_recurring: boolean;
  recurring_frequency?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateExpenseData {
  title: string;
  category: ExpenseCategory;
  expenseType: ExpenseType;
  amount: number;
  expenseDate: string;
  paymentMethod: ExpensePaymentMethod;
  payeeRecipient?: string;
  userId?: string;
  invoiceReference?: string;
  notes?: string;
  isRecurring?: boolean;
  recurringFrequency?: string;
}

export interface ExpenseTotals {
  count: number;
  totalAmount: number;
  opexAmount: number;
  capexAmount: number;
}

export interface ExpensesListResponse {
  expenses: GarageExpense[];
  totals: ExpenseTotals;
  pagination: PaginationData;
}

export interface StaffSalarySummary {
  user_id: string;
  staff_name: string;
  staff_role: string;
  staff_phone?: string;
  base_salary?: number | string;
  baseSalary?: number | string;
  payment_count: number;
  total_salary_paid: number;
  last_paid_date?: string;
}

export interface SalariesResponse {
  year: number | string;
  totalSalaryPaidYear: number;
  staffSummary: StaffSalarySummary[];
  recentSalaries: GarageExpense[];
}

export interface MonthlyTrend {
  month: string;
  revenue: number;
  cogs: number;
  opex: number;
  grossProfit: number;
  netProfit: number;
}

export interface ExpenseCategoryBreakdown {
  category: string;
  expenseType: ExpenseType;
  count: number;
  amount: number;
}

export interface FinancialReport {
  period: string;
  dateRange: {
    startDate: string;
    endDate: string;
  };
  summary: {
    totalRevenue: number;
    laborRevenue?: number;
    partsRevenue?: number;
    totalCosts: number;
    cogs?: number;
    opex?: number;
    capex?: number;
    allTimeCapex?: number;
    allTimeInvestments?: number;
    allTimeRevenue?: number;
    allTimeOpex?: number;
    allTimeCogs?: number;
    allTimeGrossProfit?: number;
    allTimeNetProfit?: number;
    lifetimeRemainingBalance?: number;
    periodRemainingBalance?: number;
    netWorkingCapital?: number;
    grossProfit?: number;
    grossProfitMargin?: number;
    totalProfit: number;
    profitMargin: number;
    netProfit?: number;
    netProfitMargin?: number;
    totalBills: number;
    paidRevenue?: number;
    pendingPayments: number;
  };
  billsByStatus: Array<{
    status: string;
    count: number;
    amount: number;
  }>;
  paymentsByStatus: Array<{
    status: string;
    count: number;
    totalAmount: number;
    paidAmount: number;
  }>;
  expenseCategories?: ExpenseCategoryBreakdown[];
  monthlyTrends?: MonthlyTrend[];
}

export interface CreateBillData {
  customerId: string;
  technicianId?: string;
  vehicleId?: string;
  vehicleNumber?: string;
  vehicleModel?: string;
  vehicleYear?: number;
  serviceDate: string;
  dueDate?: string;
  spareParts: Array<{
    sparePartId: string;
    description: string;
    quantity: number;
    unitPrice: number;
  }>;
  services: Array<{
    serviceId: string;
    description: string;
    quantity: number;
    unitPrice: number;
  }>;
  discountAmount?: number;
  taxRate?: number;
  notes?: string;
}

export interface DecodedVinData {
  vin: string;
  wmi: string;
  make?: string;
  makeId?: string;
  model?: string;
  modelId?: string;
  year?: number;
  bodyType?: string;
  fuelType?: string;
  engine?: string;
  transmission?: string;
  country?: string;
  manufacturer?: string;
  suggestedModels?: Array<{ id: string; name: string; body_type?: string }>;
  suggestedVariants?: Array<{ id: string; name: string; engine_type?: string; transmission?: string }>;
  source: 'nhtsa' | 'wmi_local';
}

export interface PaginationData {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export type JobCardStatus = 'OPEN' | 'ESTIMATED' | 'IN_PROGRESS' | 'COMPLETED' | 'INVOICED' | 'CANCELLED';
export type JobCardPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';

export interface JobCardTechnician {
  id: string;
  job_card_id: string;
  technician_id: string;
  technician_name?: string;
  technician_phone?: string;
  technician_email?: string;
  name?: string;
  role: string;
  assigned_at?: string;
}

export interface JobCardService {
  id: string;
  job_card_id: string;
  service_id?: string;
  service_name: string;
  description?: string;
  hours_qty: number;
  unit_price: number;
  total_price: number;
  is_extra_work: boolean;
  technician_id?: string;
  technician_name?: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  created_at?: string;
}

export interface JobCardSparePart {
  id: string;
  job_card_id: string;
  spare_part_id?: string;
  part_name: string;
  part_number?: string;
  description?: string;
  quantity: number;
  unit: string;
  unit_price: number;
  total_price: number;
  is_extra_work: boolean;
  stock_quantity?: number;
  status: 'REQUESTED' | 'ISSUED' | 'INSTALLED';
  created_at?: string;
}

export interface JobCard {
  id: string;
  job_card_number: string;
  customer_id: string;
  customer_name?: string;
  customer_phone?: string;
  customer_email?: string;
  customer_address?: string;
  vehicle_id?: string;
  vehicle_number?: string;
  vehicle_vin?: string;
  vehicle_year?: number;
  vehicle_model?: string;
  status: JobCardStatus;
  priority: JobCardPriority;
  odometer_reading: number;
  fuel_level: string;
  customer_complaints?: string;
  technician_diagnosis?: string;
  inventory_checklist?: Record<string, boolean>;
  visual_inspection_notes?: string;
  estimated_amount: number;
  actual_amount: number;
  customer_approved: boolean;
  customer_approved_at?: string;
  expected_delivery_date?: string;
  actual_delivery_date?: string;
  bill_id?: string;
  bill_number?: string;
  bill_payment_status?: string;
  bill_total_amount?: number;
  technicians?: JobCardTechnician[];
  services?: JobCardService[];
  spareParts?: JobCardSparePart[];
  services_count?: number;
  parts_count?: number;
  created_at: string;
  updated_at: string;
}

export interface CreateJobCardData {
  customerId: string;
  vehicleId?: string;
  priority?: JobCardPriority;
  odometerReading?: number;
  fuelLevel?: string;
  customerComplaints?: string;
  technicianDiagnosis?: string;
  inventoryChecklist?: Record<string, boolean>;
  visualInspectionNotes?: string;
  expectedDeliveryDate?: string;
  technicianIds?: string[];
  status?: JobCardStatus;
  services?: Array<{
    serviceId?: string;
    serviceName: string;
    description?: string;
    hoursQty: number;
    unitPrice: number;
  }>;
  spareParts?: Array<{
    sparePartId?: string;
    partName: string;
    partNumber?: string;
    description?: string;
    quantity: number;
    unit?: string;
    unitPrice: number;
  }>;
}

export interface UpdateJobCardData {
  status?: JobCardStatus;
  priority?: JobCardPriority;
  odometerReading?: number;
  fuelLevel?: string;
  customerComplaints?: string;
  technicianDiagnosis?: string;
  inventoryChecklist?: Record<string, boolean>;
  visualInspectionNotes?: string;
  expectedDeliveryDate?: string;
  customerApproved?: boolean;
  technicianIds?: string[];
}

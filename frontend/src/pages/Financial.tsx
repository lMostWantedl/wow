import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useAuth } from '../contexts/AuthContext';
import { financialService } from '../services/financial';
import { usersService } from '../services/users';
import {
  GarageExpense,
  ExpenseCategory,
  ExpenseType,
  ExpensePaymentMethod,
  CreateExpenseData,
  GarageInvestment,
  InvestmentType,
  CreateInvestmentData
} from '../types';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Calendar,
  RotateCcw,
  Plus,
  Search,
  Trash2,
  Edit3,
  Wrench,
  Building2,
  Users,
  AlertCircle,
  X,
  FileText,
  PieChart as PieChartIcon,
  CreditCard,
  Layers,
  ShieldCheck,
  Tag,
  ArrowUpRight,
  Briefcase,
  Landmark,
} from 'lucide-react';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { format, subMonths, isValid } from 'date-fns';
import toast from 'react-hot-toast';

// Format Indian Currency
const formatCurrency = (val: number | string | undefined | null): string => {
  const num = typeof val === 'number' ? val : parseFloat(val || '0') || 0;
  return '₹' + Math.round(num).toLocaleString('en-IN');
};

const safeFormatDate = (dateStr: string | null | undefined, fmt: string = 'dd MMM yyyy'): string => {
  if (!dateStr) return 'N/A';
  try {
    const d = new Date(dateStr);
    return isValid(d) ? format(d, fmt) : 'N/A';
  } catch {
    return 'N/A';
  }
};

// Category Configuration & Theme Badges
export const CATEGORY_CONFIG: Record<
  ExpenseCategory,
  { label: string; badgeClass: string; icon: any; defaultType: ExpenseType }
> = {
  GARAGE_SETUP: {
    label: 'Garage Setup & Civil',
    badgeClass: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border dark:border-emerald-800/60',
    icon: Building2,
    defaultType: 'CAPEX',
  },
  RENT: {
    label: 'Workshop Rent',
    badgeClass: 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 dark:border dark:border-purple-800/60',
    icon: Briefcase,
    defaultType: 'OPEX',
  },
  SALARY: {
    label: 'Staff Salary & Wages',
    badgeClass: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 dark:border dark:border-amber-800/60',
    icon: Users,
    defaultType: 'OPEX',
  },
  TOOLS_EQUIPMENT: {
    label: 'Tools & Heavy Machinery',
    badgeClass: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-950/60 dark:text-cyan-300 dark:border dark:border-cyan-800/60',
    icon: Wrench,
    defaultType: 'CAPEX',
  },
  UTILITIES: {
    label: 'Electricity & Water',
    badgeClass: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950/60 dark:text-yellow-300 dark:border dark:border-yellow-800/60',
    icon: Layers,
    defaultType: 'OPEX',
  },
  CONSUMABLES: {
    label: 'Shop Consumables & Fluids',
    badgeClass: 'bg-orange-100 text-orange-800 dark:bg-orange-950/60 dark:text-orange-300 dark:border dark:border-orange-800/60',
    icon: Tag,
    defaultType: 'OPEX',
  },
  MAINTENANCE: {
    label: 'Equipment Maintenance',
    badgeClass: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border dark:border-indigo-800/60',
    icon: Wrench,
    defaultType: 'OPEX',
  },
  MARKETING: {
    label: 'Marketing & Signage',
    badgeClass: 'bg-pink-100 text-pink-800 dark:bg-pink-950/60 dark:text-pink-300 dark:border dark:border-pink-800/60',
    icon: ArrowUpRight,
    defaultType: 'OPEX',
  },
  INSURANCE_TAX: {
    label: 'Insurance & Taxes',
    badgeClass: 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 dark:border dark:border-blue-800/60',
    icon: ShieldCheck,
    defaultType: 'OPEX',
  },
  MISCELLANEOUS: {
    label: 'Misc & Petty Cash',
    badgeClass: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 dark:border dark:border-slate-700',
    icon: CreditCard,
    defaultType: 'OPEX',
  },
};


export const INVESTMENT_TYPE_CONFIG: Record<
  InvestmentType,
  { label: string; badgeClass: string; description: string }
> = {
  INITIAL_CAPITAL: {
    label: 'Initial Setup Capital',
    badgeClass: 'bg-purple-100 text-purple-800 dark:bg-purple-950/70 dark:text-purple-300 dark:border dark:border-purple-800/60',
    description: 'Founder initial investment for garage launch',
  },
  PARTNER_EQUITY: {
    label: 'Partner / Equity Share',
    badgeClass: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 dark:border dark:border-emerald-800/60',
    description: 'Partner or shareholder equity contribution',
  },
  WORKING_CAPITAL: {
    label: 'Working Capital Injection',
    badgeClass: 'bg-sky-100 text-sky-800 dark:bg-sky-950/70 dark:text-sky-300 dark:border dark:border-sky-800/60',
    description: 'Cash infusion to support daily operations and inventory',
  },
  LOAN_DEBT: {
    label: 'Loan / Debt Facility',
    badgeClass: 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 dark:border dark:border-amber-800/60',
    description: 'Bank loan or borrowed financing facility',
  },
};

const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4', '#eab308', '#6366f1', '#64748b'];

const Financial: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Navigation tab: 'overview' | 'expenses' | 'salaries' | 'capex'
  const [activeTab, setActiveTab] = useState<'overview' | 'expenses' | 'salaries' | 'capex'>('overview');

  // Overview Filters
  const [period, setPeriod] = useState('month');
  const [startDate, setStartDate] = useState(format(subMonths(new Date(), 1), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  // Expenses Tab Filters
  const [expenseSearch, setExpenseSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<ExpenseCategory | 'ALL'>('ALL');
  const [typeFilter, setTypeFilter] = useState<ExpenseType | 'ALL'>('ALL');
  const [expenseStartDate, setExpenseStartDate] = useState('');
  const [expenseEndDate, setExpenseEndDate] = useState('');
  const [page, setPage] = useState(1);

  // Salaries Tab Year Filter
  const [salaryYear, setSalaryYear] = useState<number>(new Date().getFullYear());

  // Modal States
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<GarageExpense | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingExpense, setDeletingExpense] = useState<GarageExpense | null>(null);

  // Form State for Expense Record Modal
  const [formTitle, setFormTitle] = useState('');
  const [formCategory, setFormCategory] = useState<ExpenseCategory>('RENT');
  const [formExpenseType, setFormExpenseType] = useState<ExpenseType>('OPEX');
  const [formAmount, setFormAmount] = useState('');
  const [formDate, setFormDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [formPaymentMethod, setFormPaymentMethod] = useState<ExpensePaymentMethod>('BANK_TRANSFER');
  const [formPayee, setFormPayee] = useState('');
  const [formUserId, setFormUserId] = useState('');
  const [formInvoiceRef, setFormInvoiceRef] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formIsRecurring, setFormIsRecurring] = useState(false);
  const [formRecurringFreq, setFormRecurringFreq] = useState('MONTHLY');

  // Set Salary Modal State
  const [isSalaryConfigModalOpen, setIsSalaryConfigModalOpen] = useState(false);
  const [selectedStaffForSalary, setSelectedStaffForSalary] = useState<any>(null);
  const [salaryInputAmount, setSalaryInputAmount] = useState('');
  const [isUpdatingSalary, setIsUpdatingSalary] = useState(false);

  // 1. Financial Report Query
  const { data: financialData } = useQuery(
    ['financial-reports', period, startDate, endDate],
    () => financialService.getFinancialReports({ period, startDate, endDate }),
    { enabled: user?.role === 'MANAGER' }
  );

  // 2. Daily Summary Query
  const { data: dailyData } = useQuery(
    ['daily-financial', format(new Date(), 'yyyy-MM-dd')],
    () => financialService.getDailyFinancial(format(new Date(), 'yyyy-MM-dd')),
    { enabled: user?.role === 'MANAGER' }
  );

  // 3. Profit & Loss Statement Query
  const { data: profitLossData } = useQuery(
    ['profit-loss', startDate, endDate],
    () => financialService.getProfitLoss(startDate, endDate),
    { enabled: user?.role === 'MANAGER' }
  );

  // 4. Expenses Ledger Query
  const { data: expensesData, isLoading: isExpensesLoading } = useQuery(
    ['garage-expenses', page, expenseSearch, categoryFilter, typeFilter, expenseStartDate, expenseEndDate],
    () =>
      financialService.getExpenses({
        page,
        limit: 15,
        search: expenseSearch,
        category: categoryFilter,
        expenseType: typeFilter,
        startDate: expenseStartDate || undefined,
        endDate: expenseEndDate || undefined,
      }),
    { enabled: user?.role === 'MANAGER' }
  );

  // 5. Salaries Summary Query
  const { data: salariesData } = useQuery(
    ['financial-salaries', salaryYear],
    () => financialService.getSalaries(salaryYear),
    { enabled: user?.role === 'MANAGER' }
  );

  // 6. Investments & Capital Query
  const { data: investmentsData } = useQuery(
    ['financial-investments'],
    () => financialService.getInvestments(),
    { enabled: user?.role === 'MANAGER' }
  );

  // 6. Users List Query (to populate staff selector)
  const { data: usersData } = useQuery(
    ['all-staff-users'],
    () => usersService.getUsers({ limit: 100 }),
    { enabled: user?.role === 'MANAGER' }
  );

  // Staff members (Managers and Technicians)
  const staffMembers = (usersData?.users || []).filter(
    (u) => u.role === 'MANAGER' || u.role === 'TECHNICIAN'
  );

  // Mutations
  const createExpenseMutation = useMutation(
    (newExpense: CreateExpenseData) => financialService.createExpense(newExpense),
    {
      onSuccess: () => {
        toast.success('Expense recorded successfully');
        setIsExpenseModalOpen(false);
        resetForm();
        queryClient.invalidateQueries('financial-reports');
        queryClient.invalidateQueries('garage-expenses');
        queryClient.invalidateQueries('financial-salaries');
        queryClient.invalidateQueries('profit-loss');
        queryClient.invalidateQueries('daily-financial');
      },
      onError: (err: any) => {
        toast.error(err.response?.data?.message || 'Failed to record expense');
      },
    }
  );

  const updateExpenseMutation = useMutation(
    ({ id, data }: { id: string; data: Partial<CreateExpenseData> }) =>
      financialService.updateExpense(id, data),
    {
      onSuccess: () => {
        toast.success('Expense updated successfully');
        setIsExpenseModalOpen(false);
        setEditingExpense(null);
        resetForm();
        queryClient.invalidateQueries('financial-reports');
        queryClient.invalidateQueries('garage-expenses');
        queryClient.invalidateQueries('financial-salaries');
        queryClient.invalidateQueries('profit-loss');
        queryClient.invalidateQueries('daily-financial');
      },
      onError: (err: any) => {
        toast.error(err.response?.data?.message || 'Failed to update expense');
      },
    }
  );

  const deleteExpenseMutation = useMutation(
    (id: string) => financialService.deleteExpense(id),
    {
      onSuccess: () => {
        toast.success('Expense deleted successfully');
        setIsDeleteModalOpen(false);
        setDeletingExpense(null);
        queryClient.invalidateQueries('financial-reports');
        queryClient.invalidateQueries('garage-expenses');
        queryClient.invalidateQueries('financial-salaries');
        queryClient.invalidateQueries('profit-loss');
        queryClient.invalidateQueries('daily-financial');
      },
      onError: (err: any) => {
        toast.error(err.response?.data?.message || 'Failed to delete expense');
      },
    }
  );

  // Capital Investment Mutations
  const createInvestmentMutation = useMutation(
    (data: CreateInvestmentData) => financialService.createInvestment(data),
    {
      onSuccess: () => {
        toast.success('Capital investment recorded successfully');
        queryClient.invalidateQueries(['financial-investments']);
        queryClient.invalidateQueries(['financial-reports']);
        setIsInvestmentModalOpen(false);
        resetInvestmentForm();
      },
      onError: (err: any) => {
        toast.error(err.response?.data?.message || 'Failed to record investment');
      }
    }
  );

  const updateInvestmentMutation = useMutation(
    ({ id, data }: { id: string; data: Partial<CreateInvestmentData> }) =>
      financialService.updateInvestment(id, data),
    {
      onSuccess: () => {
        toast.success('Investment record updated successfully');
        queryClient.invalidateQueries(['financial-investments']);
        queryClient.invalidateQueries(['financial-reports']);
        setIsInvestmentModalOpen(false);
        resetInvestmentForm();
      },
      onError: (err: any) => {
        toast.error(err.response?.data?.message || 'Failed to update investment');
      }
    }
  );

  const deleteInvestmentMutation = useMutation(
    (id: string) => financialService.deleteInvestment(id),
    {
      onSuccess: () => {
        toast.success('Investment record deleted successfully');
        queryClient.invalidateQueries(['financial-investments']);
        queryClient.invalidateQueries(['financial-reports']);
        setIsDeleteInvestmentModalOpen(false);
        setDeletingInvestment(null);
      },
      onError: (err: any) => {
        toast.error(err.response?.data?.message || 'Failed to delete investment');
      }
    }
  );

  // Investment Modal States
  const [isInvestmentModalOpen, setIsInvestmentModalOpen] = useState(false);
  const [editingInvestment, setEditingInvestment] = useState<GarageInvestment | null>(null);
  const [formInvestorName, setFormInvestorName] = useState('');
  const [formInvestmentType, setFormInvestmentType] = useState<InvestmentType>('INITIAL_CAPITAL');
  const [formInvestmentAmount, setFormInvestmentAmount] = useState('');
  const [formInvestmentDate, setFormInvestmentDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [formInvestmentPaymentMethod, setFormInvestmentPaymentMethod] = useState<ExpensePaymentMethod>('BANK_TRANSFER');
  const [formInvestmentRef, setFormInvestmentRef] = useState('');
  const [formInvestmentNotes, setFormInvestmentNotes] = useState('');

  const [deletingInvestment, setDeletingInvestment] = useState<GarageInvestment | null>(null);
  const [isDeleteInvestmentModalOpen, setIsDeleteInvestmentModalOpen] = useState(false);

  const resetInvestmentForm = () => {
    setFormInvestorName('');
    setFormInvestmentType('INITIAL_CAPITAL');
    setFormInvestmentAmount('');
    setFormInvestmentDate(format(new Date(), 'yyyy-MM-dd'));
    setFormInvestmentPaymentMethod('BANK_TRANSFER');
    setFormInvestmentRef('');
    setFormInvestmentNotes('');
    setEditingInvestment(null);
  };

  const handleOpenAddInvestmentModal = (defaultType?: InvestmentType) => {
    resetInvestmentForm();
    if (defaultType) setFormInvestmentType(defaultType);
    setIsInvestmentModalOpen(true);
  };

  const handleOpenEditInvestmentModal = (inv: GarageInvestment) => {
    setEditingInvestment(inv);
    setFormInvestorName(inv.investor_name);
    setFormInvestmentType(inv.investment_type);
    setFormInvestmentAmount(String(inv.amount));
    setFormInvestmentDate(inv.investment_date ? inv.investment_date.split('T')[0] : format(new Date(), 'yyyy-MM-dd'));
    setFormInvestmentPaymentMethod(inv.payment_method);
    setFormInvestmentRef(inv.reference_number || '');
    setFormInvestmentNotes(inv.notes || '');
    setIsInvestmentModalOpen(true);
  };

  const handleSubmitInvestment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formInvestorName.trim()) {
      toast.error('Please enter investor/contributor name');
      return;
    }
    const amt = parseFloat(formInvestmentAmount);
    if (isNaN(amt) || amt <= 0) {
      toast.error('Please enter a valid positive investment amount');
      return;
    }

    const payload: CreateInvestmentData = {
      investorName: formInvestorName.trim(),
      investmentType: formInvestmentType,
      amount: amt,
      investmentDate: formInvestmentDate,
      paymentMethod: formInvestmentPaymentMethod,
      referenceNumber: formInvestmentRef.trim() || undefined,
      notes: formInvestmentNotes.trim() || undefined,
    };

    if (editingInvestment) {
      updateInvestmentMutation.mutate({ id: editingInvestment.id, data: payload });
    } else {
      createInvestmentMutation.mutate(payload);
    }
  };

  const resetForm = () => {
    setFormTitle('');
    setFormCategory('RENT');
    setFormExpenseType('OPEX');
    setFormAmount('');
    setFormDate(format(new Date(), 'yyyy-MM-dd'));
    setFormPaymentMethod('BANK_TRANSFER');
    setFormPayee('');
    setFormUserId('');
    setFormInvoiceRef('');
    setFormNotes('');
    setFormIsRecurring(false);
    setFormRecurringFreq('MONTHLY');
    setEditingExpense(null);
  };

  const handleOpenAddModal = (
    defaultCategory?: ExpenseCategory,
    defaultType?: ExpenseType,
    defaultUserId?: string,
    defaultPayee?: string,
    defaultTitle?: string,
    defaultAmount?: string | number
  ) => {
    resetForm();
    if (defaultCategory) {
      setFormCategory(defaultCategory);
      setFormExpenseType(defaultType || CATEGORY_CONFIG[defaultCategory].defaultType);
    }
    if (defaultUserId) setFormUserId(defaultUserId);
    if (defaultPayee) setFormPayee(defaultPayee);
    if (defaultTitle) setFormTitle(defaultTitle);
    if (defaultAmount && Number(defaultAmount) > 0) {
      setFormAmount(String(defaultAmount));
    }
    setIsExpenseModalOpen(true);
  };

  const handleOpenSalaryConfigModal = (staff: any) => {
    setSelectedStaffForSalary(staff);
    setSalaryInputAmount(staff.base_salary && Number(staff.base_salary) > 0 ? String(staff.base_salary) : '');
    setIsSalaryConfigModalOpen(true);
  };

  const handleSaveStaffSalary = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaffForSalary) return;
    const amount = parseFloat(salaryInputAmount);
    if (isNaN(amount) || amount < 0) {
      toast.error('Please enter a valid salary amount (0 or higher)');
      return;
    }
    setIsUpdatingSalary(true);
    try {
      await financialService.updateStaffSalary(selectedStaffForSalary.user_id, amount);
      toast.success(`Updated default salary for ${selectedStaffForSalary.staff_name} to ₹${amount.toLocaleString('en-IN')}`);
      queryClient.invalidateQueries(['financial-salaries']);
      queryClient.invalidateQueries(['users']);
      setIsSalaryConfigModalOpen(false);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update salary');
    } finally {
      setIsUpdatingSalary(false);
    }
  };

  const handleOpenEditModal = (expense: GarageExpense) => {
    setEditingExpense(expense);
    setFormTitle(expense.title);
    setFormCategory(expense.category);
    setFormExpenseType(expense.expense_type);
    setFormAmount(String(expense.amount));
    setFormDate(expense.expense_date.split('T')[0]);
    setFormPaymentMethod(expense.payment_method);
    setFormPayee(expense.payee_recipient || '');
    setFormUserId(expense.user_id || '');
    setFormInvoiceRef(expense.invoice_reference || '');
    setFormNotes(expense.notes || '');
    setFormIsRecurring(Boolean(expense.is_recurring));
    setFormRecurringFreq(expense.recurring_frequency || 'MONTHLY');
    setIsExpenseModalOpen(true);
  };

  const handleCategoryChange = (cat: ExpenseCategory) => {
    setFormCategory(cat);
    // Auto-suggest default expense type for category
    setFormExpenseType(CATEGORY_CONFIG[cat]?.defaultType || 'OPEX');
  };

  const handleSubmitExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formAmount || parseFloat(formAmount) <= 0) {
      toast.error('Please enter a valid title and positive amount');
      return;
    }

    const payload: CreateExpenseData = {
      title: formTitle.trim(),
      category: formCategory,
      expenseType: formExpenseType,
      amount: parseFloat(formAmount),
      expenseDate: formDate,
      paymentMethod: formPaymentMethod,
      payeeRecipient: formPayee.trim() || undefined,
      userId: formUserId || undefined,
      invoiceReference: formInvoiceRef.trim() || undefined,
      notes: formNotes.trim() || undefined,
      isRecurring: formIsRecurring,
      recurringFrequency: formIsRecurring ? formRecurringFreq : undefined,
    };

    if (editingExpense) {
      updateExpenseMutation.mutate({ id: editingExpense.id, data: payload });
    } else {
      createExpenseMutation.mutate(payload);
    }
  };

  if (user?.role !== 'MANAGER') {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 dark:text-slate-400">Access denied. Manager role required.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-16">
      {/* Page Header & Primary Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Financial Management</h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-primary-100 text-primary-800 dark:bg-primary-950/70 dark:text-primary-300 font-semibold border border-primary-200 dark:border-primary-800">
              Executive Suite
            </span>
          </div>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
            Track garage revenue, operating costs, staff payroll, rent, and capital setup investments
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => handleOpenAddInvestmentModal()}
            className="btn btn-secondary text-xs py-2 px-3.5 flex items-center gap-1.5 shadow-xs text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800 hover:bg-purple-50 dark:hover:bg-purple-950/40"
          >
            <Landmark className="h-4 w-4 text-purple-500" />
            <span>+ Add Investment</span>
          </button>
          <button
            onClick={() => handleOpenAddModal('SALARY', 'OPEX')}
            className="btn btn-secondary text-xs py-2 px-3.5 flex items-center gap-1.5 shadow-xs"
          >
            <Users className="h-4 w-4 text-amber-500" />
            <span>Pay Salary</span>
          </button>
          <button
            onClick={() => handleOpenAddModal()}
            className="btn btn-primary text-xs py-2 px-4 flex items-center gap-2 shadow-sm"
          >
            <Plus className="h-4 w-4" />
            <span>Record Expense</span>
          </button>
        </div>
      </div>

      {/* Main Navigation Tabs */}
      <div className="flex border-b border-gray-200 dark:border-slate-800 space-x-1 sm:space-x-3 overflow-x-auto">
        <button
          onClick={() => setActiveTab('overview')}
          className={`py-3 px-3.5 text-xs sm:text-sm font-semibold border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap ${
            activeTab === 'overview'
              ? 'border-primary-600 text-primary-600 dark:text-primary-400 dark:border-primary-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <PieChartIcon className="h-4 w-4" />
          <span>Overview & P&L</span>
        </button>
        <button
          onClick={() => setActiveTab('expenses')}
          className={`py-3 px-3.5 text-xs sm:text-sm font-semibold border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap ${
            activeTab === 'expenses'
              ? 'border-primary-600 text-primary-600 dark:text-primary-400 dark:border-primary-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <FileText className="h-4 w-4" />
          <span>Expense Ledger & Outflows</span>
          {expensesData?.totals?.count ? (
            <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono">
              {expensesData.totals.count}
            </span>
          ) : null}
        </button>
        <button
          onClick={() => setActiveTab('salaries')}
          className={`py-3 px-3.5 text-xs sm:text-sm font-semibold border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap ${
            activeTab === 'salaries'
              ? 'border-primary-600 text-primary-600 dark:text-primary-400 dark:border-primary-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <Users className="h-4 w-4" />
          <span>Staff Payroll & Salaries</span>
        </button>
        <button
          onClick={() => setActiveTab('capex')}
          className={`py-3 px-3.5 text-xs sm:text-sm font-semibold border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap ${
            activeTab === 'capex'
              ? 'border-primary-600 text-primary-600 dark:text-primary-400 dark:border-primary-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <Landmark className="h-4 w-4 text-purple-500" />
          <span>Garage Capital, Setup & Assets (CapEx)</span>
          {investmentsData?.investments?.length ? (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 font-mono">
              {investmentsData.investments.length} inv
            </span>
          ) : null}
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: EXECUTIVE OVERVIEW & P&L */}
      {/* ========================================================================= */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Executive Capital & Working Liquidity Bar */}
          <div className="p-4 sm:p-5 rounded-xl bg-gradient-to-r from-purple-950/50 via-slate-900 to-indigo-950/50 border border-purple-800/40 text-white flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
            <div className="flex items-center gap-3.5">
              <div className="p-3 rounded-xl bg-purple-600/20 text-purple-300 border border-purple-500/30">
                <Landmark className="h-6 w-6" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-purple-300">
                  Garage Working Capital & Liquidity Position
                </span>
                <h3 className="text-lg font-extrabold text-white">
                  Total Capital Invested: {formatCurrency(investmentsData?.totalInvested || 0)}
                </h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  Initial setup funds, partner equity, and active capital reserve deployed in garage infrastructure.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                onClick={() => handleOpenAddInvestmentModal()}
                className="btn btn-primary text-xs py-2 px-3.5 flex items-center gap-1.5 shadow-sm"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>+ Add Capital / Investment</span>
              </button>
              <button
                onClick={() => setActiveTab('capex')}
                className="btn btn-secondary text-xs py-2 px-3 flex items-center gap-1.5"
              >
                <span>View Capital & CapEx Assets</span>
                <ArrowUpRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
          {/* Controls: Segmented Period + Date Picker */}
          <div className="card p-4 sm:p-5 bg-white dark:bg-[#0c101c] border border-gray-200 dark:border-slate-800/90 rounded-xl shadow-xs">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              {/* Segmented Period Filter */}
              <div className="flex bg-slate-200/80 dark:bg-slate-900/90 p-1 rounded-xl border border-slate-300 dark:border-slate-800 shadow-inner self-start">
                {['day', 'week', 'month', 'year'].map((p) => (
                  <button
                    key={p}
                    onClick={() => setPeriod(p)}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all duration-200 ${
                      period === p
                        ? 'bg-primary-600 text-white shadow-md'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-300/50 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>

              {/* Date Pickers */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 dark:text-slate-400 font-medium">From:</span>
                  <input
                    type="date"
                    className="input text-xs font-mono py-1.5 px-2.5 w-36"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 dark:text-slate-400 font-medium">To:</span>
                  <input
                    type="date"
                    className="input text-xs font-mono py-1.5 px-2.5 w-36"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
                <button
                  onClick={() => {
                    const now = new Date();
                    setStartDate(format(subMonths(now, 1), 'yyyy-MM-dd'));
                    setEndDate(format(now, 'yyyy-MM-dd'));
                    setPeriod('month');
                  }}
                  className="btn btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5"
                  title="Reset date range to last 30 days"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>Reset</span>
                </button>
              </div>
            </div>
          </div>

          {/* KPI Stat Cards */}
          {financialData && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Gross Revenue */}
              <div className="card p-5 bg-white dark:bg-[#0c101c] border border-gray-200 dark:border-slate-800/90 rounded-xl shadow-xs">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-gray-500 dark:text-slate-400">Total Gross Revenue</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                      {formatCurrency(financialData.summary.totalRevenue)}
                    </p>
                    <div className="flex items-center gap-2 mt-2 text-[11px] text-gray-500 dark:text-slate-400">
                      <span>Labor: {formatCurrency(financialData.summary.laborRevenue)}</span>
                      <span>•</span>
                      <span>Parts: {formatCurrency(financialData.summary.partsRevenue)}</span>
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/50">
                    <DollarSign className="h-6 w-6" />
                  </div>
                </div>
              </div>

              {/* Operating Outflows (COGS + OpEx) */}
              <div className="card p-5 bg-white dark:bg-[#0c101c] border border-gray-200 dark:border-slate-800/90 rounded-xl shadow-xs">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-gray-500 dark:text-slate-400">Operating Outflows</p>
                    <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">
                      {formatCurrency(financialData.summary.totalCosts)}
                    </p>
                    <div className="flex items-center gap-2 mt-2 text-[11px] text-gray-500 dark:text-slate-400">
                      <span>Parts COGS: {formatCurrency(financialData.summary.cogs)}</span>
                      <span>•</span>
                      <span>OpEx: {formatCurrency(financialData.summary.opex)}</span>
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-900/50">
                    <TrendingDown className="h-6 w-6" />
                  </div>
                </div>
              </div>

              {/* Net Operating Profit */}
              <div className="card p-5 bg-white dark:bg-[#0c101c] border border-gray-200 dark:border-slate-800/90 rounded-xl shadow-xs">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-gray-500 dark:text-slate-400">Net Operating Profit</p>
                    <p
                      className={`text-2xl font-bold mt-1 ${
                        (financialData.summary.netProfit || 0) >= 0
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-amber-500 dark:text-amber-400'
                      }`}
                    >
                      {formatCurrency(financialData.summary.netProfit)}
                    </p>
                    <div className="flex items-center gap-1.5 mt-2 text-[11px]">
                      <span className="text-gray-500 dark:text-slate-400">Margin:</span>
                      <span
                        className={`font-semibold ${
                          (financialData.summary.netProfitMargin || 0) >= 0
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-amber-500 dark:text-amber-400'
                        }`}
                      >
                        {financialData.summary.netProfitMargin?.toFixed(1)}%
                      </span>
                      <span className="text-gray-400">•</span>
                      <span className="text-gray-500 dark:text-slate-400">
                        Gross: {financialData.summary.grossProfitMargin?.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/50">
                    <TrendingUp className="h-6 w-6" />
                  </div>
                </div>
              </div>

              {/* Garage Setup & Assets (CapEx) */}
              <div className="card p-5 bg-white dark:bg-[#0c101c] border border-gray-200 dark:border-slate-800/90 rounded-xl shadow-xs">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-gray-500 dark:text-slate-400">Total Setup & CapEx Assets</p>
                    <p className="text-2xl font-bold text-purple-600 dark:text-purple-400 mt-1">
                      {formatCurrency(financialData.summary.allTimeCapex)}
                    </p>
                    <div className="flex items-center gap-2 mt-2 text-[11px] text-gray-500 dark:text-slate-400">
                      <span>Equipment, Lifts & Bays</span>
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 border border-purple-100 dark:border-purple-900/50">
                    <Building2 className="h-6 w-6" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Interactive Charts: 6-Month Monthly Trend & Expense Category Distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Monthly Trend Area / Bar Chart */}
            <div className="lg:col-span-2 card p-5 bg-white dark:bg-[#0c101c] border border-gray-200 dark:border-slate-800/90 rounded-xl shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-gray-900 dark:text-slate-100">
                    6-Month Financial Trajectory (Revenue vs Total Costs vs Net Profit)
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                    Gross sales minus spare parts costs and workshop operating expenses
                  </p>
                </div>
              </div>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={financialData?.monthlyTrends || []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.5} />
                    <XAxis dataKey="month" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                    <YAxis
                      stroke="#64748b"
                      tick={{ fill: '#94a3b8', fontSize: 11 }}
                      tickFormatter={(v) => `₹${v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v}`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0c101c',
                        borderColor: '#1e293b',
                        borderRadius: '0.75rem',
                        color: '#f8fafc',
                        fontSize: '12px',
                        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.6)',
                      }}
                      formatter={(val: any) => [formatCurrency(val), '']}
                    />
                    <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                    <Bar dataKey="revenue" name="Gross Revenue" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="opex" name="Operating Expenses" fill="#ef4444" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="netProfit" name="Net Profit" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Expense Categories Donut Chart */}
            <div className="card p-5 bg-white dark:bg-[#0c101c] border border-gray-200 dark:border-slate-800/90 rounded-xl shadow-xs flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-slate-100 mb-1">
                  Expense Outflow Distribution
                </h3>
                <p className="text-xs text-gray-500 dark:text-slate-400 mb-4">
                  Breakdown by category for selected timeframe
                </p>
                <div className="h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={financialData?.expenseCategories || []}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={3}
                        dataKey="amount"
                        nameKey="category"
                        stroke="#0c101c"
                        strokeWidth={2}
                      >
                        {(financialData?.expenseCategories || []).map((_, index) => (
                          <Cell key={`cat-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#0c101c',
                          borderColor: '#1e293b',
                          borderRadius: '0.75rem',
                          color: '#f8fafc',
                          fontSize: '12px',
                          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.6)',
                        }}
                        formatter={(val: any, name: any) => [
                          formatCurrency(val),
                          CATEGORY_CONFIG[name as ExpenseCategory]?.label || name,
                        ]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Legend List */}
              <div className="space-y-1.5 mt-2 max-h-32 overflow-y-auto text-xs pr-1">
                {(financialData?.expenseCategories || []).map((cat, idx) => (
                  <div key={cat.category} className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                    <div className="flex items-center gap-2 truncate">
                      <div
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }}
                      />
                      <span className="truncate">
                        {CATEGORY_CONFIG[cat.category as ExpenseCategory]?.label || cat.category}
                      </span>
                    </div>
                    <span className="font-semibold text-slate-900 dark:text-slate-100">
                      {formatCurrency(cat.amount)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Today's Operational Pulse */}
          {dailyData && (
            <div className="card p-5 bg-white dark:bg-[#0c101c] border border-gray-200 dark:border-slate-800/90 rounded-xl shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-gray-900 dark:text-slate-100 flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-primary-500" />
                  <span>Today's Real-Time Financial Pulse</span>
                </h3>
                <span className="text-xs font-mono text-gray-500 dark:text-slate-400">
                  {safeFormatDate(dailyData.date, 'EEEE, dd MMMM yyyy')}
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-3.5 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/40">
                  <p className="text-[11px] font-semibold text-gray-500 dark:text-slate-400">Today's Invoiced Revenue</p>
                  <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                    {formatCurrency(dailyData.summary.totalRevenue)}
                  </p>
                </div>
                <div className="p-3.5 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-900/40">
                  <p className="text-[11px] font-semibold text-gray-500 dark:text-slate-400">Payments Collected</p>
                  <p className="text-xl font-bold text-blue-600 dark:text-blue-400 mt-0.5">
                    {formatCurrency(dailyData.summary.paymentsCollected)}
                  </p>
                </div>
                <div className="p-3.5 rounded-xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200/60 dark:border-purple-900/40">
                  <p className="text-[11px] font-semibold text-gray-500 dark:text-slate-400">Bills Generated</p>
                  <p className="text-xl font-bold text-purple-600 dark:text-purple-400 mt-0.5">
                    {dailyData.summary.totalBills} Bills
                  </p>
                </div>
                <div className="p-3.5 rounded-xl bg-red-50/50 dark:bg-red-950/20 border border-red-200/60 dark:border-red-900/40">
                  <p className="text-[11px] font-semibold text-gray-500 dark:text-slate-400">Daily Expenses Incurred</p>
                  <p className="text-xl font-bold text-red-600 dark:text-red-400 mt-0.5">
                    {formatCurrency(dailyData.summary.dailyExpenses)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Structured Profit & Loss Waterfall Statement */}
          {profitLossData && (
            <div className="card p-6 bg-white dark:bg-[#0c101c] border border-gray-200 dark:border-slate-800/90 rounded-xl shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-gray-100 dark:border-slate-800 gap-2">
                <div>
                  <h3 className="text-base font-bold text-gray-900 dark:text-slate-100">
                    Comprehensive Profit & Loss Statement (P&L)
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                    Period: {safeFormatDate(profitLossData.period?.startDate)} to {safeFormatDate(profitLossData.period?.endDate)}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-500 dark:text-slate-400">Net Margin: </span>
                  <span
                    className={`font-mono font-bold text-sm ${
                      (profitLossData.profit?.netProfit || 0) >= 0
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-amber-500 dark:text-amber-400'
                    }`}
                  >
                    {profitLossData.profit?.netProfitMargin?.toFixed(1)}%
                  </span>
                </div>
              </div>

              <div className="mt-5 space-y-6">
                {/* 1. Operating Income */}
                <div>
                  <div className="flex items-center justify-between py-1.5 px-3 bg-slate-50 dark:bg-slate-900/60 rounded-lg text-xs font-bold uppercase tracking-wider text-primary-700 dark:text-primary-300">
                    <span>1. Operating Revenue & Gross Sales</span>
                    <span>Amount (₹)</span>
                  </div>
                  <div className="divide-y divide-gray-100 dark:divide-slate-800/60 text-xs px-3">
                    <div className="flex justify-between py-2 text-slate-600 dark:text-slate-400">
                      <span>Service & Labor Charges</span>
                      <span className="font-semibold text-slate-900 dark:text-slate-100 font-mono">
                        {formatCurrency(profitLossData.income?.serviceRevenue)}
                      </span>
                    </div>
                    <div className="flex justify-between py-2 text-slate-600 dark:text-slate-400">
                      <span>Spare Parts Sales Revenue</span>
                      <span className="font-semibold text-slate-900 dark:text-slate-100 font-mono">
                        {formatCurrency(profitLossData.income?.sparePartRevenue)}
                      </span>
                    </div>
                    <div className="flex justify-between py-2.5 font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50/30 dark:bg-emerald-950/20 px-2 rounded">
                      <span>Total Gross Revenue</span>
                      <span className="font-mono text-sm">
                        {formatCurrency(profitLossData.income?.totalRevenue)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 2. Cost of Goods Sold (COGS) */}
                <div>
                  <div className="flex items-center justify-between py-1.5 px-3 bg-slate-50 dark:bg-slate-900/60 rounded-lg text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                    <span>2. Cost of Goods Sold (COGS)</span>
                    <span>Amount (₹)</span>
                  </div>
                  <div className="divide-y divide-gray-100 dark:divide-slate-800/60 text-xs px-3">
                    <div className="flex justify-between py-2 text-slate-600 dark:text-slate-400">
                      <span>Spare Parts Inventory Purchase Cost</span>
                      <span className="font-semibold text-slate-900 dark:text-slate-100 font-mono">
                        {formatCurrency(profitLossData.costs?.sparePartCosts)}
                      </span>
                    </div>
                    <div className="flex justify-between py-2.5 font-bold text-blue-600 dark:text-blue-400 bg-blue-50/30 dark:bg-blue-950/20 px-2 rounded">
                      <span>
                        Gross Profit (Revenue - COGS) [Margin: {profitLossData.profit?.grossProfitMargin?.toFixed(1)}%]
                      </span>
                      <span className="font-mono text-sm">
                        {formatCurrency(profitLossData.profit?.grossProfit)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 3. Operating Expenditures (OpEx) */}
                <div>
                  <div className="flex items-center justify-between py-1.5 px-3 bg-slate-50 dark:bg-slate-900/60 rounded-lg text-xs font-bold uppercase tracking-wider text-red-700 dark:text-red-400">
                    <span>3. Workshop Operating Expenditures (OpEx)</span>
                    <span>Amount (₹)</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1.5 text-xs px-3 py-2 divide-y md:divide-y-0 divide-gray-100 dark:divide-slate-800/60">
                    <div className="flex justify-between py-1.5 text-slate-600 dark:text-slate-400 border-b border-gray-100 dark:border-slate-800/60">
                      <span>Workshop Monthly Rent:</span>
                      <span className="font-semibold text-slate-900 dark:text-slate-100 font-mono">
                        {formatCurrency(profitLossData.costs?.rent)}
                      </span>
                    </div>
                    <div className="flex justify-between py-1.5 text-slate-600 dark:text-slate-400 border-b border-gray-100 dark:border-slate-800/60">
                      <span>Staff Salaries & Mechanic Payroll:</span>
                      <span className="font-semibold text-slate-900 dark:text-slate-100 font-mono">
                        {formatCurrency(profitLossData.costs?.salaries)}
                      </span>
                    </div>
                    <div className="flex justify-between py-1.5 text-slate-600 dark:text-slate-400 border-b border-gray-100 dark:border-slate-800/60">
                      <span>Electricity, Water & Utilities:</span>
                      <span className="font-semibold text-slate-900 dark:text-slate-100 font-mono">
                        {formatCurrency(profitLossData.costs?.utilities)}
                      </span>
                    </div>
                    <div className="flex justify-between py-1.5 text-slate-600 dark:text-slate-400 border-b border-gray-100 dark:border-slate-800/60">
                      <span>Workshop Consumables & Fluids:</span>
                      <span className="font-semibold text-slate-900 dark:text-slate-100 font-mono">
                        {formatCurrency(profitLossData.costs?.consumables)}
                      </span>
                    </div>
                    <div className="flex justify-between py-1.5 text-slate-600 dark:text-slate-400 border-b border-gray-100 dark:border-slate-800/60">
                      <span>Facility & Lift Maintenance:</span>
                      <span className="font-semibold text-slate-900 dark:text-slate-100 font-mono">
                        {formatCurrency(profitLossData.costs?.maintenance)}
                      </span>
                    </div>
                    <div className="flex justify-between py-1.5 text-slate-600 dark:text-slate-400 border-b border-gray-100 dark:border-slate-800/60">
                      <span>Marketing & Local Advertising:</span>
                      <span className="font-semibold text-slate-900 dark:text-slate-100 font-mono">
                        {formatCurrency(profitLossData.costs?.marketing)}
                      </span>
                    </div>
                    <div className="flex justify-between py-1.5 text-slate-600 dark:text-slate-400 border-b border-gray-100 dark:border-slate-800/60">
                      <span>Commercial Insurance & Taxes:</span>
                      <span className="font-semibold text-slate-900 dark:text-slate-100 font-mono">
                        {formatCurrency(profitLossData.costs?.insuranceTax)}
                      </span>
                    </div>
                    <div className="flex justify-between py-1.5 text-slate-600 dark:text-slate-400 border-b border-gray-100 dark:border-slate-800/60">
                      <span>Miscellaneous & Petty Cash:</span>
                      <span className="font-semibold text-slate-900 dark:text-slate-100 font-mono">
                        {formatCurrency(profitLossData.costs?.miscellaneous)}
                      </span>
                    </div>
                  </div>
                  <div className="flex justify-between py-2.5 px-3 font-bold text-red-600 dark:text-red-400 bg-red-50/30 dark:bg-red-950/20 rounded mx-3">
                    <span>Total Operating Expenses (OpEx)</span>
                    <span className="font-mono text-sm">
                      {formatCurrency(profitLossData.costs?.totalOpex)}
                    </span>
                  </div>
                </div>

                {/* 4. Bottom Line: Net Operating Profit */}
                <div className="p-4 rounded-xl bg-slate-900 dark:bg-black text-white border border-slate-700/80 shadow-md">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                        Bottom Line (Gross Profit - Operating Expenses)
                      </span>
                      <h4 className="text-xl sm:text-2xl font-bold mt-0.5">
                        True Net Operating Profit
                      </h4>
                    </div>
                    <div className="text-right">
                      <p
                        className={`text-2xl sm:text-3xl font-extrabold font-mono ${
                          (profitLossData.profit?.netProfit || 0) >= 0 ? 'text-emerald-400' : 'text-amber-400'
                        }`}
                      >
                        {formatCurrency(profitLossData.profit?.netProfit)}
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        Net Operating Margin: {profitLossData.profit?.netProfitMargin?.toFixed(2)}%
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: EXPENSE LEDGER & OUTFLOWS */}
      {/* ========================================================================= */}
      {activeTab === 'expenses' && (
        <div className="space-y-6">
          {/* Summary Stat Strip */}
          {expensesData?.totals && (
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="card p-4 bg-white dark:bg-[#0c101c] border border-gray-200 dark:border-slate-800/90 rounded-xl shadow-xs">
                <p className="text-xs font-medium text-gray-500 dark:text-slate-400">Total Filtered Outflows</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white mt-1">
                  {formatCurrency(expensesData.totals.totalAmount)}
                </p>
              </div>
              <div className="card p-4 bg-white dark:bg-[#0c101c] border border-gray-200 dark:border-slate-800/90 rounded-xl shadow-xs">
                <p className="text-xs font-medium text-gray-500 dark:text-slate-400">Operating Expenses (OpEx)</p>
                <p className="text-xl font-bold text-red-600 dark:text-red-400 mt-1">
                  {formatCurrency(expensesData.totals.opexAmount)}
                </p>
              </div>
              <div className="card p-4 bg-white dark:bg-[#0c101c] border border-gray-200 dark:border-slate-800/90 rounded-xl shadow-xs">
                <p className="text-xs font-medium text-gray-500 dark:text-slate-400">Capital Assets (CapEx)</p>
                <p className="text-xl font-bold text-purple-600 dark:text-purple-400 mt-1">
                  {formatCurrency(expensesData.totals.capexAmount)}
                </p>
              </div>
              <div className="card p-4 bg-white dark:bg-[#0c101c] border border-gray-200 dark:border-slate-800/90 rounded-xl shadow-xs">
                <p className="text-xs font-medium text-gray-500 dark:text-slate-400">Total Records</p>
                <p className="text-xl font-bold text-primary-600 dark:text-primary-400 mt-1">
                  {expensesData.totals.count} entries
                </p>
              </div>
            </div>
          )}

          {/* Filter Bar */}
          <div className="card p-4 bg-white dark:bg-[#0c101c] border border-gray-200 dark:border-slate-800/90 rounded-xl shadow-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search expense, payee, ref..."
                  className="input pl-9 text-xs w-full"
                  value={expenseSearch}
                  onChange={(e) => {
                    setExpenseSearch(e.target.value);
                    setPage(1);
                  }}
                />
              </div>

              {/* Category Filter */}
              <div>
                <select
                  className="input text-xs w-full"
                  value={categoryFilter}
                  onChange={(e) => {
                    setCategoryFilter(e.target.value as any);
                    setPage(1);
                  }}
                >
                  <option value="ALL">All Categories</option>
                  {Object.entries(CATEGORY_CONFIG).map(([key, cfg]) => (
                    <option key={key} value={key}>
                      {cfg.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Type Filter */}
              <div>
                <select
                  className="input text-xs w-full"
                  value={typeFilter}
                  onChange={(e) => {
                    setTypeFilter(e.target.value as any);
                    setPage(1);
                  }}
                >
                  <option value="ALL">All Types (OpEx & CapEx)</option>
                  <option value="OPEX">OpEx Only (Operating)</option>
                  <option value="CAPEX">CapEx Only (Capital Asset)</option>
                </select>
              </div>

              {/* Date From */}
              <div>
                <input
                  type="date"
                  placeholder="From date"
                  className="input text-xs font-mono w-full"
                  value={expenseStartDate}
                  onChange={(e) => {
                    setExpenseStartDate(e.target.value);
                    setPage(1);
                  }}
                />
              </div>

              {/* Date To & Clear */}
              <div className="flex gap-2">
                <input
                  type="date"
                  placeholder="To date"
                  className="input text-xs font-mono w-full"
                  value={expenseEndDate}
                  onChange={(e) => {
                    setExpenseEndDate(e.target.value);
                    setPage(1);
                  }}
                />
                {(expenseSearch || categoryFilter !== 'ALL' || typeFilter !== 'ALL' || expenseStartDate || expenseEndDate) && (
                  <button
                    onClick={() => {
                      setExpenseSearch('');
                      setCategoryFilter('ALL');
                      setTypeFilter('ALL');
                      setExpenseStartDate('');
                      setExpenseEndDate('');
                      setPage(1);
                    }}
                    className="btn btn-secondary text-xs px-2.5 py-1"
                    title="Clear filters"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Expenses Table */}
          <div className="card overflow-hidden bg-white dark:bg-[#0c101c] border border-gray-200 dark:border-slate-800/90 rounded-xl shadow-xs">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-800">
                <thead className="bg-gray-50 dark:bg-slate-900/60">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                      Expense #
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                      Title & Details
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                      Category
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                      Payee / Vendor
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                      Mode
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-slate-800 text-xs">
                  {isExpensesLoading ? (
                    <tr>
                      <td colSpan={9} className="text-center py-10">
                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                        <p className="mt-2 text-xs text-gray-500 dark:text-slate-400">Loading expense ledger...</p>
                      </td>
                    </tr>
                  ) : (expensesData?.expenses || []).length === 0 ? (
                    <tr>
                      <td colSpan={9} className="text-center py-12">
                        <AlertCircle className="mx-auto h-8 w-8 text-gray-400" />
                        <p className="mt-2 text-sm font-medium text-gray-900 dark:text-slate-100">No expenses found</p>
                        <p className="text-xs text-gray-500 dark:text-slate-400">
                          Try adjusting your search filters or record a new expense.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    (expensesData?.expenses || []).map((exp) => {
                      const catConfig = CATEGORY_CONFIG[exp.category] || CATEGORY_CONFIG.MISCELLANEOUS;
                      return (
                        <tr
                          key={exp.id}
                          className="hover:bg-gray-50/80 dark:hover:bg-slate-800/40 transition-colors"
                        >
                          <td className="px-4 py-3 font-mono font-medium text-gray-900 dark:text-slate-200 whitespace-nowrap">
                            {exp.expense_number}
                          </td>
                          <td className="px-4 py-3 text-gray-600 dark:text-slate-400 font-mono whitespace-nowrap">
                            {safeFormatDate(exp.expense_date, 'dd MMM yyyy')}
                          </td>
                          <td className="px-4 py-3 max-w-xs">
                            <div className="font-semibold text-gray-900 dark:text-slate-100 truncate">
                              {exp.title}
                            </div>
                            {exp.notes && (
                              <div className="text-[11px] text-gray-500 dark:text-slate-400 truncate mt-0.5">
                                {exp.notes}
                              </div>
                            )}
                            {exp.invoice_reference && (
                              <div className="text-[10px] font-mono text-primary-600 dark:text-primary-400 mt-0.5">
                                Ref: {exp.invoice_reference}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium ${catConfig.badgeClass}`}
                            >
                              <catConfig.icon className="h-3 w-3" />
                              <span>{catConfig.label}</span>
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase font-mono ${
                                exp.expense_type === 'CAPEX'
                                  ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/70 dark:text-purple-300 border border-purple-300 dark:border-purple-800'
                                  : 'bg-sky-100 text-sky-800 dark:bg-sky-950/70 dark:text-sky-300 border border-sky-300 dark:border-sky-800'
                              }`}
                            >
                              {exp.expense_type}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-700 dark:text-slate-300 whitespace-nowrap">
                            {exp.staff_name ? (
                              <span className="flex items-center gap-1 font-medium text-amber-600 dark:text-amber-400">
                                <Users className="h-3 w-3" />
                                {exp.staff_name} ({exp.staff_role})
                              </span>
                            ) : (
                              exp.payee_recipient || '-'
                            )}
                          </td>
                          <td className="px-4 py-3 text-gray-600 dark:text-slate-400 font-mono text-[11px] whitespace-nowrap">
                            {exp.payment_method}
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-sm text-gray-900 dark:text-white font-mono whitespace-nowrap">
                            {formatCurrency(exp.amount)}
                          </td>
                          <td className="px-4 py-3 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleOpenEditModal(exp)}
                                className="p-1.5 rounded-lg text-gray-500 hover:text-primary-600 hover:bg-gray-100 dark:text-slate-400 dark:hover:text-primary-400 dark:hover:bg-slate-800 transition-colors"
                                title="Edit Expense"
                              >
                                <Edit3 className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => {
                                  setDeletingExpense(exp);
                                  setIsDeleteModalOpen(true);
                                }}
                                className="p-1.5 rounded-lg text-gray-500 hover:text-red-600 hover:bg-red-50 dark:text-slate-400 dark:hover:text-red-400 dark:hover:bg-red-950/40 transition-colors"
                                title="Delete Expense"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {expensesData?.pagination && expensesData.pagination.pages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-slate-800 text-xs">
                <span className="text-gray-500 dark:text-slate-400">
                  Showing page {expensesData.pagination.page} of {expensesData.pagination.pages}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="btn btn-secondary text-xs py-1 px-3 disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    disabled={page >= expensesData.pagination.pages}
                    onClick={() => setPage((p) => p + 1)}
                    className="btn btn-secondary text-xs py-1 px-3 disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: STAFF PAYROLL & SALARIES */}
      {/* ========================================================================= */}
      {activeTab === 'salaries' && (
        <div className="space-y-6">
          {/* Header Card with Year Filter */}
          <div className="card p-5 bg-white dark:bg-[#0c101c] border border-gray-200 dark:border-slate-800/90 rounded-xl shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-slate-100 flex items-center gap-2">
                  <Users className="h-5 w-5 text-amber-500" />
                  <span>Workshop Staff Payroll & Wage Records</span>
                </h3>
                <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                  Tracks individual salaries, mechanics payouts, disbursements, and payment vouchers
                </p>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-500 dark:text-slate-400 font-medium">Payroll Year:</span>
                <select
                  className="input text-xs font-mono py-1.5 px-3"
                  value={salaryYear}
                  onChange={(e) => setSalaryYear(parseInt(e.target.value, 10))}
                >
                  {[2024, 2025, 2026, 2027].map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => handleOpenAddModal('SALARY', 'OPEX')}
                  className="btn btn-primary text-xs py-1.5 px-3.5 flex items-center gap-1.5"
                >
                  <Plus className="h-4 w-4" />
                  <span>Disburse Salary</span>
                </button>
              </div>
            </div>

            {/* Total Annual Payroll Card */}
            {salariesData && (
              <div className="mt-4 p-4 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <p className="text-xs font-semibold text-amber-800 dark:text-amber-300">
                    Total Salary Disbursed in {salaryYear}
                  </p>
                  <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-0.5 font-mono">
                    {formatCurrency(salariesData.totalSalaryPaidYear)}
                  </p>
                </div>
                <div className="text-xs text-amber-700 dark:text-amber-300/80">
                  <span>{salariesData.staffSummary?.length || 0} Registered Employees</span>
                </div>
              </div>
            )}
          </div>

          {/* Individual Staff Cards Grid */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400 mb-3">
              Individual Staff Member Salary Cards
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {(salariesData?.staffSummary || []).map((staff) => (
                <div
                  key={staff.user_id}
                  className="card p-5 bg-white dark:bg-[#0c101c] border border-gray-200 dark:border-slate-800/90 rounded-xl shadow-xs flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-bold text-sm text-gray-900 dark:text-slate-100">{staff.staff_name}</h4>
                        <p className="text-xs text-gray-500 dark:text-slate-400 font-mono">{staff.staff_phone || 'No phone'}</p>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold tracking-wider uppercase ${
                          staff.staff_role === 'MANAGER'
                            ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/70 dark:text-purple-300'
                            : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300'
                        }`}
                      >
                        {staff.staff_role}
                      </span>
                    </div>

                    <div className="mt-4 pt-3 border-t border-gray-100 dark:border-slate-800/80 space-y-2.5 text-xs">
                      {/* Base Salary Row */}
                      <div className="flex justify-between items-center bg-gray-50 dark:bg-slate-900/60 p-2.5 rounded-lg border border-gray-100 dark:border-slate-800">
                        <div>
                          <span className="text-[10px] uppercase font-bold text-gray-500 dark:text-slate-400 block tracking-wider">
                            Base Monthly Salary:
                          </span>
                          <span className="font-bold text-sm text-emerald-600 dark:text-emerald-400 font-mono">
                            {Number(staff.base_salary) > 0 ? formatCurrency(staff.base_salary) : 'Not configured'}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleOpenSalaryConfigModal(staff)}
                          className="btn btn-secondary text-[11px] py-1 px-2.5 flex items-center gap-1 text-primary-600 dark:text-primary-400 border-primary-200 dark:border-primary-900/50 hover:bg-primary-50 dark:hover:bg-primary-950/40 transition-colors"
                          title="Configure default monthly salary"
                        >
                          <Edit3 className="h-3 w-3" />
                          <span>{Number(staff.base_salary) > 0 ? 'Edit' : 'Set Salary'}</span>
                        </button>
                      </div>

                      <div className="flex justify-between pt-1">
                        <span className="text-gray-500 dark:text-slate-400">Total Paid in {salaryYear}:</span>
                        <span className="font-bold text-gray-900 dark:text-white font-mono">
                          {formatCurrency(staff.total_salary_paid)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500 dark:text-slate-400">Payout Count:</span>
                        <span className="font-mono text-gray-700 dark:text-slate-300">
                          {staff.payment_count} disbursements
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500 dark:text-slate-400">Last Paid Date:</span>
                        <span className="font-mono text-gray-700 dark:text-slate-300">
                          {safeFormatDate(staff.last_paid_date, 'dd MMM yyyy')}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-gray-100 dark:border-slate-800/80">
                    <button
                      onClick={() =>
                        handleOpenAddModal(
                          'SALARY',
                          'OPEX',
                          staff.user_id,
                          staff.staff_name,
                          `Monthly Salary - ${staff.staff_name} (${format(new Date(), 'MMM yyyy')})`,
                          Number(staff.base_salary) > 0 ? staff.base_salary : ''
                        )
                      }
                      className="btn btn-secondary text-xs w-full py-1.5 flex items-center justify-center gap-1.5"
                    >
                      <Plus className="h-3.5 w-3.5 text-amber-500" />
                      <span>Record Salary Payout</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Salary Payouts Table */}
          <div className="card overflow-hidden bg-white dark:bg-[#0c101c] border border-gray-200 dark:border-slate-800/90 rounded-xl shadow-xs">
            <div className="px-5 py-4 border-b border-gray-200 dark:border-slate-800">
              <h4 className="text-sm font-bold text-gray-900 dark:text-slate-100">
                Recent Salary Payout Transactions
              </h4>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-800">
                <thead className="bg-gray-50 dark:bg-slate-900/60">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                      Voucher / Exp #
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                      Disbursement Date
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                      Staff Member
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                      Title / Period
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                      Payment Mode
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                      Reference #
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                      Amount Paid
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-slate-800 text-xs">
                  {(salariesData?.recentSalaries || []).length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-8 text-gray-500 dark:text-slate-400">
                        No salary payout records found
                      </td>
                    </tr>
                  ) : (
                    (salariesData?.recentSalaries || []).map((sal) => (
                      <tr key={sal.id} className="hover:bg-gray-50/80 dark:hover:bg-slate-800/40">
                        <td className="px-4 py-3 font-mono font-medium text-gray-900 dark:text-slate-200">
                          {sal.expense_number}
                        </td>
                        <td className="px-4 py-3 text-gray-600 dark:text-slate-400 font-mono">
                          {safeFormatDate(sal.expense_date, 'dd MMM yyyy')}
                        </td>
                        <td className="px-4 py-3 font-semibold text-gray-900 dark:text-slate-100">
                          {sal.staff_name || sal.payee_recipient}
                          {sal.staff_role && (
                            <span className="ml-1.5 text-[10px] text-gray-400 font-normal">
                              ({sal.staff_role})
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-600 dark:text-slate-300 max-w-xs truncate">
                          {sal.title}
                        </td>
                        <td className="px-4 py-3 font-mono text-gray-500 dark:text-slate-400">
                          {sal.payment_method}
                        </td>
                        <td className="px-4 py-3 font-mono text-primary-600 dark:text-primary-400">
                          {sal.invoice_reference || '-'}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-sm text-emerald-600 dark:text-emerald-400 font-mono">
                          {formatCurrency(sal.amount)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleOpenEditModal(sal)}
                              className="p-1.5 rounded-lg text-gray-500 hover:text-primary-600 hover:bg-gray-100 dark:text-slate-400 dark:hover:text-primary-400 dark:hover:bg-slate-800"
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                setDeletingExpense(sal);
                                setIsDeleteModalOpen(true);
                              }}
                              className="p-1.5 rounded-lg text-gray-500 hover:text-red-600 hover:bg-red-50 dark:text-slate-400 dark:hover:text-red-400 dark:hover:bg-red-950/40"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: GARAGE CAPITAL, SETUP & ASSETS (CAPEX) */}
      {/* ========================================================================= */}
      {activeTab === 'capex' && (
        <div className="space-y-6">
          {/* Header Capital Position & Valuation Card */}
          <div className="card p-6 bg-white dark:bg-[#0c101c] border border-gray-200 dark:border-slate-800/90 rounded-xl shadow-xs">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded bg-purple-100 text-purple-800 dark:bg-purple-950/70 dark:text-purple-300 uppercase tracking-wider font-mono">
                  Owner Equity, Capital Setup & Fixed Assets
                </span>
                <h3 className="text-xl font-bold text-gray-900 dark:text-slate-100 mt-2">
                  Garage Capital Inflow & Fixed Asset Valuation
                </h3>
                <p className="text-xs text-gray-500 dark:text-slate-400 mt-1 max-w-2xl leading-relaxed">
                  Track the initial investment put into founding the garage, additional partner equity, and capital expenditures (CapEx) spent on structural bays, car lifts, air compressors, and machinery.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 min-w-[320px]">
                <div className="p-3.5 rounded-xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/60">
                  <p className="text-xs font-semibold text-purple-700 dark:text-purple-300">Total Capital Invested</p>
                  <p className="text-2xl font-extrabold text-purple-600 dark:text-purple-400 font-mono mt-0.5">
                    {formatCurrency(investmentsData?.totalInvested || 0)}
                  </p>
                  <button
                    onClick={() => handleOpenAddInvestmentModal()}
                    className="mt-2.5 btn btn-primary text-xs w-full py-1.5 flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>+ Add Investment</span>
                  </button>
                </div>

                <div className="p-3.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/60">
                  <p className="text-xs font-semibold text-indigo-700 dark:text-indigo-300">Workshop Asset Value</p>
                  <p className="text-2xl font-extrabold text-indigo-600 dark:text-indigo-400 font-mono mt-0.5">
                    {formatCurrency(financialData?.summary.allTimeCapex)}
                  </p>
                  <button
                    onClick={() => handleOpenAddModal('GARAGE_SETUP', 'CAPEX')}
                    className="mt-2.5 btn btn-secondary text-xs w-full py-1.5 flex items-center justify-center gap-1.5"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>+ Add Capital Asset</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Section 1: Capital Investment Inflow Contributions */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-sm font-bold text-gray-900 dark:text-slate-100 flex items-center gap-2">
                  <Landmark className="h-4 w-4 text-purple-500" />
                  <span>Garage Capital & Investment Ledger</span>
                </h4>
                <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                  Initial founder capital, partner shares, and financial injections into the garage
                </p>
              </div>

              <button
                onClick={() => handleOpenAddInvestmentModal()}
                className="btn btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5 self-start text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800 hover:bg-purple-50 dark:hover:bg-purple-950/40"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Record New Investment</span>
              </button>
            </div>

            {/* Investment Type Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              <div className="card p-3.5 bg-white dark:bg-[#0c101c] border border-gray-200 dark:border-slate-800/90 rounded-xl shadow-xs">
                <span className="text-[10px] uppercase font-bold text-gray-500 dark:text-slate-400 block tracking-wider">
                  Initial Launch Capital
                </span>
                <p className="text-lg font-bold text-purple-600 dark:text-purple-400 font-mono mt-0.5">
                  {formatCurrency(investmentsData?.byType?.INITIAL_CAPITAL || 0)}
                </p>
                <p className="text-[11px] text-gray-400 mt-0.5">Founding setup capital</p>
              </div>

              <div className="card p-3.5 bg-white dark:bg-[#0c101c] border border-gray-200 dark:border-slate-800/90 rounded-xl shadow-xs">
                <span className="text-[10px] uppercase font-bold text-gray-500 dark:text-slate-400 block tracking-wider">
                  Partner / Equity Shares
                </span>
                <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400 font-mono mt-0.5">
                  {formatCurrency(investmentsData?.byType?.PARTNER_EQUITY || 0)}
                </p>
                <p className="text-[11px] text-gray-400 mt-0.5">Partner capital contributions</p>
              </div>

              <div className="card p-3.5 bg-white dark:bg-[#0c101c] border border-gray-200 dark:border-slate-800/90 rounded-xl shadow-xs">
                <span className="text-[10px] uppercase font-bold text-gray-500 dark:text-slate-400 block tracking-wider">
                  Working Capital Infusions
                </span>
                <p className="text-lg font-bold text-sky-600 dark:text-sky-400 font-mono mt-0.5">
                  {formatCurrency(investmentsData?.byType?.WORKING_CAPITAL || 0)}
                </p>
                <p className="text-[11px] text-gray-400 mt-0.5">Daily cashflow injections</p>
              </div>

              <div className="card p-3.5 bg-white dark:bg-[#0c101c] border border-gray-200 dark:border-slate-800/90 rounded-xl shadow-xs">
                <span className="text-[10px] uppercase font-bold text-gray-500 dark:text-slate-400 block tracking-wider">
                  Loans & Debt Financing
                </span>
                <p className="text-lg font-bold text-amber-600 dark:text-amber-400 font-mono mt-0.5">
                  {formatCurrency(investmentsData?.byType?.LOAN_DEBT || 0)}
                </p>
                <p className="text-[11px] text-gray-400 mt-0.5">Bank loans / credit lines</p>
              </div>
            </div>

            {/* Investments Table */}
            <div className="card overflow-hidden bg-white dark:bg-[#0c101c] border border-gray-200 dark:border-slate-800/90 rounded-xl shadow-xs">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-800">
                  <thead className="bg-gray-50 dark:bg-slate-900/60">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                        Inv #
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                        Investor / Contributor
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                        Payment Mode
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                        Reference #
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                        Amount (₹)
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-slate-800 text-xs">
                    {(investmentsData?.investments || []).length === 0 ? (
                      <tr>
                        <td colSpan={8} className="text-center py-8 text-gray-500 dark:text-slate-400">
                          <Landmark className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                          <p className="font-semibold">No capital investments recorded yet</p>
                          <p className="text-xs text-gray-400 mt-1">
                            Click "+ Add Investment" above to record the initial founder seed money, partner shares, or working capital.
                          </p>
                        </td>
                      </tr>
                    ) : (
                      (investmentsData?.investments || []).map((inv) => {
                        const invConfig = INVESTMENT_TYPE_CONFIG[inv.investment_type] || INVESTMENT_TYPE_CONFIG.INITIAL_CAPITAL;
                        return (
                          <tr key={inv.id} className="hover:bg-gray-50/80 dark:hover:bg-slate-800/40">
                            <td className="px-4 py-3 font-mono font-medium text-gray-900 dark:text-slate-200">
                              {inv.investment_number}
                            </td>
                            <td className="px-4 py-3 text-gray-600 dark:text-slate-400 font-mono">
                              {safeFormatDate(inv.investment_date, 'dd MMM yyyy')}
                            </td>
                            <td className="px-4 py-3 font-semibold text-gray-900 dark:text-slate-100">
                              {inv.investor_name}
                              {inv.notes && (
                                <p className="text-[11px] text-gray-500 dark:text-slate-400 font-normal mt-0.5 max-w-xs truncate">
                                  {inv.notes}
                                </p>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${invConfig.badgeClass}`}>
                                {invConfig.label}
                              </span>
                            </td>
                            <td className="px-4 py-3 font-mono text-gray-700 dark:text-slate-300">
                              {inv.payment_method}
                            </td>
                            <td className="px-4 py-3 font-mono text-primary-600 dark:text-primary-400">
                              {inv.reference_number || '—'}
                            </td>
                            <td className="px-4 py-3 text-right font-bold text-sm text-emerald-600 dark:text-emerald-400 font-mono">
                              +{formatCurrency(inv.amount)}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => handleOpenEditInvestmentModal(inv)}
                                  className="p-1.5 rounded-lg text-gray-500 hover:text-primary-600 hover:bg-gray-100 dark:text-slate-400 dark:hover:text-primary-400 dark:hover:bg-slate-800"
                                  title="Edit Investment"
                                >
                                  <Edit3 className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  onClick={() => {
                                    setDeletingInvestment(inv);
                                    setIsDeleteInvestmentModalOpen(true);
                                  }}
                                  className="p-1.5 rounded-lg text-gray-500 hover:text-red-600 hover:bg-red-50 dark:text-slate-400 dark:hover:text-red-400 dark:hover:bg-red-950/40"
                                  title="Delete Investment"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Section 2: Fixed Workshop Physical Capital Assets (CapEx) */}
          <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-slate-800">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-sm font-bold text-gray-900 dark:text-slate-100 flex items-center gap-2">
                  <Wrench className="h-4 w-4 text-cyan-500" />
                  <span>Workshop Capital Asset Register (CapEx Deployed)</span>
                </h4>
                <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                  Physical garage equipment, hydraulic car lifts, structural bays, and diagnostics
                </p>
              </div>

              <button
                onClick={() => handleOpenAddModal('TOOLS_EQUIPMENT', 'CAPEX')}
                className="btn btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5 self-start"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Record New Tool / Machinery</span>
              </button>
            </div>

            {/* CapEx Asset Categories Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="card p-4 bg-white dark:bg-[#0c101c] border border-gray-200 dark:border-slate-800/90 rounded-xl shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-gray-900 dark:text-slate-100">Garage Setup & Civil Bays</h4>
                    <p className="text-[11px] text-gray-500 dark:text-slate-400">Flooring, structural bays, signboards</p>
                  </div>
                </div>
              </div>

              <div className="card p-4 bg-white dark:bg-[#0c101c] border border-gray-200 dark:border-slate-800/90 rounded-xl shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-lg bg-cyan-50 dark:bg-cyan-950/40 text-cyan-600 dark:text-cyan-400">
                    <Wrench className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-gray-900 dark:text-slate-100">Car Lifts & Compressors</h4>
                    <p className="text-[11px] text-gray-500 dark:text-slate-400">Hydraulic 2-post lifts, screw compressors</p>
                  </div>
                </div>
              </div>

              <div className="card p-4 bg-white dark:bg-[#0c101c] border border-gray-200 dark:border-slate-800/90 rounded-xl shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400">
                    <Layers className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-gray-900 dark:text-slate-100">Diagnostic & Pro Scanners</h4>
                    <p className="text-[11px] text-gray-500 dark:text-slate-400">OBD-II scanners, ECU flashes, battery testers</p>
                  </div>
                </div>
              </div>
            </div>

            {/* CapEx Assets Table (Filtered from expensesData where expense_type === 'CAPEX') */}
            <div className="card overflow-hidden bg-white dark:bg-[#0c101c] border border-gray-200 dark:border-slate-800/90 rounded-xl shadow-xs">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-800">
                  <thead className="bg-gray-50 dark:bg-slate-900/60">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                        Asset / Exp #
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                        Acquisition Date
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                        Asset Description
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                        Category
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                        Vendor / Payee
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                        Invoice Ref
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                        Asset Cost (₹)
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-slate-800 text-xs">
                    {(expensesData?.expenses || [])
                      .filter((e) => e.expense_type === 'CAPEX')
                      .map((asset) => {
                        const catConfig = CATEGORY_CONFIG[asset.category] || CATEGORY_CONFIG.GARAGE_SETUP;
                        return (
                          <tr key={asset.id} className="hover:bg-gray-50/80 dark:hover:bg-slate-800/40">
                            <td className="px-4 py-3 font-mono font-medium text-gray-900 dark:text-slate-200">
                              {asset.expense_number}
                            </td>
                            <td className="px-4 py-3 text-gray-600 dark:text-slate-400 font-mono">
                              {safeFormatDate(asset.expense_date, 'dd MMM yyyy')}
                            </td>
                            <td className="px-4 py-3 font-semibold text-gray-900 dark:text-slate-100">
                              {asset.title}
                              {asset.notes && (
                                <p className="text-[11px] text-gray-500 dark:text-slate-400 font-normal mt-0.5">
                                  {asset.notes}
                                </p>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${catConfig.badgeClass}`}>
                                {catConfig.label}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-gray-700 dark:text-slate-300">
                              {asset.payee_recipient || '—'}
                            </td>
                            <td className="px-4 py-3 font-mono text-primary-600 dark:text-primary-400">
                              {asset.invoice_reference || '—'}
                            </td>
                            <td className="px-4 py-3 text-right font-bold text-sm text-purple-600 dark:text-purple-400 font-mono">
                              {formatCurrency(asset.amount)}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => handleOpenEditModal(asset)}
                                  className="p-1.5 rounded-lg text-gray-500 hover:text-primary-600 hover:bg-gray-100 dark:text-slate-400 dark:hover:text-primary-400 dark:hover:bg-slate-800"
                                  title="Edit Asset"
                                >
                                  <Edit3 className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  onClick={() => {
                                    setDeletingExpense(asset);
                                    setIsDeleteModalOpen(true);
                                  }}
                                  className="p-1.5 rounded-lg text-gray-500 hover:text-red-600 hover:bg-red-50 dark:text-slate-400 dark:hover:text-red-400 dark:hover:bg-red-950/40"
                                  title="Delete Asset"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: RECORD / EDIT EXPENSE */}
      {/* ========================================================================= */}
      {isExpenseModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0c101c] border border-gray-200 dark:border-slate-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-slate-800">
              <h3 className="text-base font-bold text-gray-900 dark:text-slate-100 flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary-500" />
                <span>{editingExpense ? 'Edit Financial Expense' : 'Record Garage Outflow'}</span>
              </h3>
              <button
                onClick={() => {
                  setIsExpenseModalOpen(false);
                  resetForm();
                }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitExpense} className="mt-4 space-y-4 text-xs">
              {/* Title */}
              <div>
                <label className="block font-semibold text-gray-700 dark:text-slate-300 mb-1">
                  Expense Title / Purpose *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Workshop Monthly Rent, Snap-on Impact Wrench, TNEB Bill"
                  className="input text-xs w-full"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                />
              </div>

              {/* Category & Type */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-gray-700 dark:text-slate-300 mb-1">
                    Expense Category *
                  </label>
                  <select
                    className="input text-xs w-full"
                    value={formCategory}
                    onChange={(e) => handleCategoryChange(e.target.value as ExpenseCategory)}
                  >
                    {Object.entries(CATEGORY_CONFIG).map(([key, cfg]) => (
                      <option key={key} value={key}>
                        {cfg.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 dark:text-slate-300 mb-1">
                    Accounting Classification *
                  </label>
                  <div className="flex gap-2 mt-1">
                    <button
                      type="button"
                      onClick={() => setFormExpenseType('OPEX')}
                      className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold border transition-all ${
                        formExpenseType === 'OPEX'
                          ? 'bg-sky-600 text-white border-sky-600 shadow-xs'
                          : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400 border-gray-200 dark:border-slate-700'
                      }`}
                    >
                      OpEx (Operational)
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormExpenseType('CAPEX')}
                      className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold border transition-all ${
                        formExpenseType === 'CAPEX'
                          ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                          : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400 border-gray-200 dark:border-slate-700'
                      }`}
                    >
                      CapEx (Fixed Asset)
                    </button>
                  </div>
                </div>
              </div>

              {/* Amount & Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-gray-700 dark:text-slate-300 mb-1">
                    Amount (₹) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-gray-500">₹</span>
                    <input
                      type="number"
                      step="0.01"
                      required
                      placeholder="0.00"
                      className="input pl-7 text-xs font-mono font-bold w-full"
                      value={formAmount}
                      onChange={(e) => setFormAmount(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 dark:text-slate-300 mb-1">
                    Disbursement / Payment Date *
                  </label>
                  <input
                    type="date"
                    required
                    className="input text-xs font-mono w-full"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                  />
                </div>
              </div>

              {/* Payment Method & Payee */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-gray-700 dark:text-slate-300 mb-1">
                    Payment Method *
                  </label>
                  <select
                    className="input text-xs w-full"
                    value={formPaymentMethod}
                    onChange={(e) => setFormPaymentMethod(e.target.value as ExpensePaymentMethod)}
                  >
                    <option value="BANK_TRANSFER">Bank Transfer (NEFT/RTGS/IMPS)</option>
                    <option value="UPI">UPI / GooglePay / PhonePe</option>
                    <option value="CASH">Cash Voucher</option>
                    <option value="CARD">Debit / Credit Card</option>
                    <option value="CHEQUE">Cheque</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 dark:text-slate-300 mb-1">
                    Payee / Recipient / Vendor Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Landlord, Snap-on Tools, Dhanush"
                    className="input text-xs w-full"
                    value={formPayee}
                    onChange={(e) => setFormPayee(e.target.value)}
                  />
                </div>
              </div>

              {/* Conditionally Highlighted: Linked Staff Member (when Category is SALARY) */}
              {(formCategory === 'SALARY' || staffMembers.length > 0) && (
                <div className={`p-3 rounded-xl border ${
                  formCategory === 'SALARY'
                    ? 'bg-amber-50/60 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800/60'
                    : 'bg-gray-50/60 dark:bg-slate-900/40 border-gray-200 dark:border-slate-800'
                }`}>
                  <label className="block font-semibold text-gray-800 dark:text-slate-200 mb-1 flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5 text-amber-500" />
                    <span>Associated Staff Member (Mechanic / Manager)</span>
                  </label>
                  <select
                    className="input text-xs w-full"
                    value={formUserId}
                    onChange={(e) => {
                      const uid = e.target.value;
                      setFormUserId(uid);
                      const selectedStaff = staffMembers.find((s) => s.id === uid);
                      if (selectedStaff) {
                        setFormPayee(selectedStaff.name);
                        if (formCategory === 'SALARY') {
                          if (!formTitle || formTitle.startsWith('Monthly Salary')) {
                            setFormTitle(`Monthly Salary - ${selectedStaff.name} (${format(new Date(), 'MMM yyyy')})`);
                          }
                          const staffSumm = (salariesData?.staffSummary || []).find((s) => s.user_id === uid);
                          const baseSal = Number(staffSumm?.base_salary ?? (selectedStaff as any).baseSalary ?? (selectedStaff as any).base_salary ?? 0);
                          if (baseSal > 0) {
                            setFormAmount(String(baseSal));
                          }
                        }
                      }
                    }}
                  >
                    <option value="">-- No specific staff user linked --</option>
                    {staffMembers.map((staff) => {
                      const staffSumm = (salariesData?.staffSummary || []).find((s) => s.user_id === staff.id);
                      const sal = Number(staffSumm?.base_salary ?? (staff as any).baseSalary ?? (staff as any).base_salary ?? 0);
                      return (
                        <option key={staff.id} value={staff.id}>
                          {staff.name} ({staff.role}) {sal > 0 ? `• ₹${sal.toLocaleString('en-IN')}/mo` : ''} - {staff.phone}
                        </option>
                      );
                    })}
                  </select>
                </div>
              )}

              {/* Invoice / Reference & Recurring Toggle */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                <div>
                  <label className="block font-semibold text-gray-700 dark:text-slate-300 mb-1">
                    Invoice / Receipt / Cheque #
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. INV-2026-1049, CHQ-99120"
                    className="input text-xs font-mono w-full"
                    value={formInvoiceRef}
                    onChange={(e) => setFormInvoiceRef(e.target.value)}
                  />
                </div>

                <div className="pt-4">
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 h-4 w-4"
                      checked={formIsRecurring}
                      onChange={(e) => setFormIsRecurring(e.target.checked)}
                    />
                    <span className="font-semibold text-gray-700 dark:text-slate-300">
                      Recurring (Monthly / Periodic)
                    </span>
                  </label>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block font-semibold text-gray-700 dark:text-slate-300 mb-1">
                  Notes & Details
                </label>
                <textarea
                  rows={2}
                  placeholder="Warranty info, serial numbers, bank transaction reference, remarks..."
                  className="input text-xs w-full resize-none"
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setIsExpenseModalOpen(false);
                    resetForm();
                  }}
                  className="btn btn-secondary text-xs py-2 px-4"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createExpenseMutation.isLoading || updateExpenseMutation.isLoading}
                  className="btn btn-primary text-xs py-2 px-5 flex items-center gap-2"
                >
                  {(createExpenseMutation.isLoading || updateExpenseMutation.isLoading) && (
                    <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white"></div>
                  )}
                  <span>{editingExpense ? 'Save Changes' : 'Confirm & Record'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: DELETE CONFIRMATION */}
      {/* ========================================================================= */}
      {isDeleteModalOpen && deletingExpense && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0c101c] border border-gray-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
              <div className="p-3 rounded-full bg-red-100 dark:bg-red-950/60">
                <Trash2 className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-slate-100">Delete Expense Record?</h3>
                <p className="text-xs text-gray-500 dark:text-slate-400">This action cannot be undone.</p>
              </div>
            </div>

            <div className="mt-4 p-3.5 rounded-xl bg-gray-50 dark:bg-slate-900/60 border border-gray-200 dark:border-slate-800 text-xs space-y-1.5">
              <p className="font-semibold text-gray-900 dark:text-slate-100">{deletingExpense.title}</p>
              <div className="flex justify-between text-gray-500 dark:text-slate-400">
                <span>Number: {deletingExpense.expense_number}</span>
                <span className="font-mono font-bold text-red-600 dark:text-red-400">
                  {formatCurrency(deletingExpense.amount)}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setDeletingExpense(null);
                }}
                className="btn btn-secondary text-xs py-2 px-4"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleteExpenseMutation.isLoading}
                onClick={() => deleteExpenseMutation.mutate(deletingExpense.id)}
                className="btn bg-red-600 hover:bg-red-700 text-white text-xs py-2 px-4 font-semibold rounded-lg"
              >
                {deleteExpenseMutation.isLoading ? 'Deleting...' : 'Delete Expense'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Set Employee Default Salary Modal */}
      {isSalaryConfigModalOpen && selectedStaffForSalary && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="card max-w-md w-full bg-white dark:bg-[#0d1220] border border-gray-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900/80 border-b border-gray-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
                  <CreditCard className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                    Set Employee Base Salary
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-slate-400">
                    Configure default monthly compensation
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsSalaryConfigModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 p-1"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveStaffSalary} className="p-6 space-y-4">
              <div className="bg-gray-50 dark:bg-slate-900/50 p-3 rounded-xl border border-gray-100 dark:border-slate-800 space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-500 dark:text-slate-400">Employee:</span>
                  <span className="font-bold text-xs text-gray-900 dark:text-slate-100">
                    {selectedStaffForSalary.staff_name}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-500 dark:text-slate-400">Role:</span>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-purple-100 text-purple-800 dark:bg-purple-950/70 dark:text-purple-300">
                    {selectedStaffForSalary.staff_role}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-500 dark:text-slate-400">Phone:</span>
                  <span className="font-mono text-xs text-gray-700 dark:text-slate-300">
                    {selectedStaffForSalary.staff_phone || 'N/A'}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1.5">
                  Monthly Base Salary (₹) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">
                    ₹
                  </span>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    required
                    placeholder="e.g. 25000"
                    value={salaryInputAmount}
                    onChange={(e) => setSalaryInputAmount(e.target.value)}
                    className="input pl-8 w-full font-mono text-sm"
                    autoFocus
                  />
                </div>
                <p className="text-[11px] text-gray-500 dark:text-slate-400 mt-1.5">
                  When you record a salary payout for this employee, this amount will automatically pre-fill into the payment voucher.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-gray-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsSalaryConfigModalOpen(false)}
                  className="btn btn-secondary text-xs py-2 px-3.5"
                  disabled={isUpdatingSalary}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary text-xs py-2 px-4 flex items-center gap-1.5"
                  disabled={isUpdatingSalary}
                >
                  {isUpdatingSalary ? (
                    <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white"></div>
                  ) : (
                    <span>Save Salary</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* RECORD / EDIT CAPITAL INVESTMENT MODAL */}
      {/* ========================================================================= */}
      {isInvestmentModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="card max-w-lg w-full bg-white dark:bg-[#0d1220] border border-gray-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900/80 border-b border-gray-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400">
                  <Landmark className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900 dark:text-white">
                    {editingInvestment ? 'Edit Capital Investment' : 'Record Capital / Initial Investment'}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-slate-400">
                    {editingInvestment ? `Update ${editingInvestment.investment_number}` : 'Record founder funds, partner shares, or working capital injected'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsInvestmentModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 p-1"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitInvestment} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">
                  Investor / Contributor Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Pratheep Kumar (Founder), Ramannathan (Partner)"
                  className="input text-xs w-full"
                  value={formInvestorName}
                  onChange={(e) => setFormInvestorName(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">
                    Investment Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    className="input text-xs w-full"
                    value={formInvestmentType}
                    onChange={(e) => setFormInvestmentType(e.target.value as InvestmentType)}
                  >
                    <option value="INITIAL_CAPITAL">Initial Setup Capital (Launch Fund)</option>
                    <option value="PARTNER_EQUITY">Partner / Shareholder Equity</option>
                    <option value="WORKING_CAPITAL">Additional Working Capital</option>
                    <option value="LOAN_DEBT">Loan / Financing Facility</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">
                    Investment Amount (₹) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">
                      ₹
                    </span>
                    <input
                      type="number"
                      step="any"
                      min="1"
                      required
                      placeholder="e.g. 500000"
                      className="input pl-8 text-xs w-full font-mono font-bold text-emerald-600 dark:text-emerald-400"
                      value={formInvestmentAmount}
                      onChange={(e) => setFormInvestmentAmount(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">
                    Deposit / Investment Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    className="input text-xs w-full font-mono"
                    value={formInvestmentDate}
                    onChange={(e) => setFormInvestmentDate(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">
                    Payment Method
                  </label>
                  <select
                    className="input text-xs w-full"
                    value={formInvestmentPaymentMethod}
                    onChange={(e) => setFormInvestmentPaymentMethod(e.target.value as ExpensePaymentMethod)}
                  >
                    <option value="BANK_TRANSFER">Bank Transfer (NEFT/RTGS/IMPS)</option>
                    <option value="UPI">UPI / GooglePay / PhonePe</option>
                    <option value="CHEQUE">Cheque</option>
                    <option value="CASH">Cash Deposit</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">
                  Bank Reference / Cheque / UTR #
                </label>
                <input
                  type="text"
                  placeholder="e.g. UTR-98234823, Cheque #49281"
                  className="input text-xs w-full font-mono"
                  value={formInvestmentRef}
                  onChange={(e) => setFormInvestmentRef(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">
                  Notes & Investment Terms
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. 50% initial seed capital for workshop civil setup and tools purchase"
                  className="input text-xs w-full py-2"
                  value={formInvestmentNotes}
                  onChange={(e) => setFormInvestmentNotes(e.target.value)}
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-gray-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsInvestmentModalOpen(false)}
                  className="btn btn-secondary text-xs py-2 px-3.5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createInvestmentMutation.isLoading || updateInvestmentMutation.isLoading}
                  className="btn btn-primary text-xs py-2 px-4 flex items-center gap-1.5"
                >
                  {createInvestmentMutation.isLoading || updateInvestmentMutation.isLoading ? (
                    <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white"></div>
                  ) : (
                    <span>{editingInvestment ? 'Update Investment' : 'Save Investment'}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Investment Confirmation Modal */}
      {isDeleteInvestmentModalOpen && deletingInvestment && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="card max-w-sm w-full p-6 bg-white dark:bg-[#0d1220] border border-gray-200 dark:border-slate-800 rounded-2xl shadow-xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-full bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400">
                <AlertCircle className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white">Delete Investment Record</h3>
                <p className="text-xs text-gray-500 dark:text-slate-400">This action cannot be undone.</p>
              </div>
            </div>
            <p className="text-xs text-gray-600 dark:text-slate-300">
              Are you sure you want to delete investment from <strong className="text-gray-900 dark:text-white">"{deletingInvestment.investor_name}"</strong> ({formatCurrency(deletingInvestment.amount)}) from the capital ledger?
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsDeleteInvestmentModalOpen(false);
                  setDeletingInvestment(null);
                }}
                className="btn btn-secondary text-xs py-2 px-4"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleteInvestmentMutation.isLoading}
                onClick={() => deleteInvestmentMutation.mutate(deletingInvestment.id)}
                className="btn bg-red-600 hover:bg-red-700 text-white text-xs py-2 px-4 font-semibold rounded-lg"
              >
                {deleteInvestmentMutation.isLoading ? 'Deleting...' : 'Delete Investment'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Financial;

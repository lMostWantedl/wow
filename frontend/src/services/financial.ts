import api from './api';
import {
  FinancialReport,
  GarageExpense,
  CreateExpenseData,
  ExpensesListResponse,
  SalariesResponse,
  ExpenseCategory,
  ExpenseType,
  GarageInvestment,
  CreateInvestmentData,
  InvestmentsResponse
} from '../types';

export interface DailyFinancialResponse {
  date: string;
  summary: {
    totalRevenue: number;
    totalBills: number;
    totalPayments: number;
    paymentsCollected: number;
    dailyExpenses: number;
  };
  bills?: any[];
  payments?: any[];
  topServices?: any[];
  topSpareParts?: any[];
}

export interface ProfitLossCosts {
  sparePartCosts: number;
  rent: number;
  salaries: number;
  toolsEquipment: number;
  utilities: number;
  consumables: number;
  maintenance: number;
  marketing: number;
  insuranceTax: number;
  miscellaneous: number;
  totalOpex: number;
}

export interface ProfitLossResponse {
  period: {
    startDate: string;
    endDate: string;
  };
  income: {
    totalRevenue: number;
    serviceRevenue: number;
    sparePartRevenue: number;
  };
  costs: ProfitLossCosts;
  profit: {
    grossProfit: number;
    grossProfitMargin: number;
    netProfit: number;
    netProfitMargin: number;
  };
  bills?: any[];
}

export interface ExpenseQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  category?: ExpenseCategory | 'ALL';
  expenseType?: ExpenseType | 'ALL';
  startDate?: string;
  endDate?: string;
}

export const financialService = {
  getFinancialReports: async (params?: {
    period?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<FinancialReport> => {
    const response = await api.get('/financial/report', { params });
    return response.data;
  },

  getDailyFinancial: async (date?: string): Promise<DailyFinancialResponse> => {
    const response = await api.get('/financial/daily', { params: { date } });
    return response.data;
  },

  getProfitLoss: async (startDate: string, endDate: string): Promise<ProfitLossResponse> => {
    const response = await api.get('/financial/profit-loss', { 
      params: { startDate, endDate } 
    });
    return response.data;
  },

  getExpenses: async (params?: ExpenseQueryParams): Promise<ExpensesListResponse> => {
    const response = await api.get('/financial/expenses', { params });
    return response.data;
  },

  createExpense: async (data: CreateExpenseData): Promise<{ message: string; expense: GarageExpense }> => {
    const response = await api.post('/financial/expenses', data);
    return response.data;
  },

  updateExpense: async (
    id: string,
    data: Partial<CreateExpenseData>
  ): Promise<{ message: string; expense: GarageExpense }> => {
    const response = await api.put(`/financial/expenses/${id}`, data);
    return response.data;
  },

  deleteExpense: async (id: string): Promise<{ message: string; deletedId: string }> => {
    const response = await api.delete(`/financial/expenses/${id}`);
    return response.data;
  },

  getSalaries: async (year?: number | string): Promise<SalariesResponse> => {
    const response = await api.get('/financial/salaries', { params: { year } });
    return response.data;
  },

  updateStaffSalary: async (userId: string, baseSalary: number): Promise<{ message: string; staff: any }> => {
    const response = await api.put(`/financial/staff-salary/${userId}`, { baseSalary });
    return response.data;
  },

  getInvestments: async (): Promise<InvestmentsResponse> => {
    const response = await api.get('/financial/investments');
    return response.data;
  },

  createInvestment: async (
    data: CreateInvestmentData
  ): Promise<{ message: string; investment: GarageInvestment }> => {
    const response = await api.post('/financial/investments', data);
    return response.data;
  },

  updateInvestment: async (
    id: string,
    data: Partial<CreateInvestmentData>
  ): Promise<{ message: string; investment: GarageInvestment }> => {
    const response = await api.put(`/financial/investments/${id}`, data);
    return response.data;
  },

  deleteInvestment: async (id: string): Promise<{ message: string; deletedId: string }> => {
    const response = await api.delete(`/financial/investments/${id}`);
    return response.data;
  },
};

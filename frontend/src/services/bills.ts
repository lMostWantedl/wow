import api from './api';
import { Bill, BillListItem, BillDetailsItem, CreateBillData, PaginationData } from '../types';

export interface BillsResponse {
  bills: BillListItem[];
  pagination: PaginationData;
}

export interface BillResponse {
  bill: BillDetailsItem;
}

export interface CreateBillResponse {
  message: string;
  bill: Bill;
}

export interface PaymentData {
  amount: number;
  paymentMethod: string;
  reference?: string;
  notes?: string;
}

export const billsService = {
  getBills: async (params?: {
    page?: number;
    limit?: number;
    status?: string;
    paymentStatus?: string;
    customerId?: string;
    technicianId?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<BillsResponse> => {
    const response = await api.get('/bills', { params });
    return response.data;
  },

  getBill: async (id: string): Promise<BillResponse> => {
    const response = await api.get(`/bills/${id}`);
    return response.data;
  },

  createBill: async (data: CreateBillData): Promise<CreateBillResponse> => {
    const response = await api.post('/bills', data);
    return response.data;
  },

  updateBill: async (id: string, data: Partial<CreateBillData>): Promise<CreateBillResponse> => {
    const response = await api.put(`/bills/${id}`, data);
    return response.data;
  },

  addPayment: async (id: string, data: PaymentData): Promise<{ message: string; payment: any }> => {
    const response = await api.post(`/bills/${id}/payments`, data);
    return response.data;
  },

  deleteBill: async (id: string): Promise<{ message: string }> => {
    const response = await api.delete(`/bills/${id}`);
    return response.data;
  },
};

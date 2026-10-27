import api from './api';
import { SparePart, PaginationData } from '../types';

export interface SparePartsResponse {
  spareParts: SparePart[];
  pagination: PaginationData;
}

export interface SparePartResponse {
  sparePart: SparePart;
}

export interface CreateSparePartData {
  name: string;
  partNumber: string;
  description?: string;
  category: string;
  price: number;
  cost: number;
  stock?: number;
  minStock?: number;
  supplier?: string;
}

export interface StockUpdateData {
  quantity: number;
  operation: 'add' | 'subtract' | 'set';
  reason?: string;
}

export const sparePartsService = {
  getSpareParts: async (params?: {
    page?: number;
    limit?: number;
    category?: string;
    search?: string;
    lowStock?: boolean;
  }): Promise<SparePartsResponse> => {
    const response = await api.get('/spare-parts', { params });
    return response.data;
  },

  getSparePart: async (id: string): Promise<SparePartResponse> => {
    const response = await api.get(`/spare-parts/${id}`);
    return response.data;
  },

  getCategories: async (): Promise<{ categories: string[] }> => {
    const response = await api.get('/spare-parts/categories');
    return response.data;
  },

  createCategory: async (name: string): Promise<{ message: string; category: string }> => {
    const response = await api.post('/spare-parts/categories', { name });
    return response.data;
  },

  getLowStockItems: async (): Promise<{ lowStockItems: SparePart[] }> => {
    const response = await api.get('/spare-parts/low-stock');
    return response.data;
  },

  createSparePart: async (data: CreateSparePartData): Promise<SparePartResponse> => {
    const response = await api.post('/spare-parts', data);
    return response.data;
  },

  updateSparePart: async (id: string, data: Partial<CreateSparePartData>): Promise<SparePartResponse> => {
    const response = await api.put(`/spare-parts/${id}`, data);
    return response.data;
  },

  updateStock: async (id: string, data: StockUpdateData): Promise<SparePartResponse> => {
    const response = await api.patch(`/spare-parts/${id}/stock`, data);
    return response.data;
  },

  deleteSparePart: async (id: string): Promise<{ message: string }> => {
    const response = await api.delete(`/spare-parts/${id}`);
    return response.data;
  },

  getUsageStatistics: async (id: string, params?: {
    startDate?: string;
    endDate?: string;
  }): Promise<any> => {
    const response = await api.get(`/spare-parts/${id}/usage`, { params });
    return response.data;
  },
};

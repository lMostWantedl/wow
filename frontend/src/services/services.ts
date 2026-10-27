import api from './api';
import { Service, PaginationData } from '../types';

export interface ServicesResponse {
  services: Service[];
  pagination: PaginationData;
}

export interface ServiceResponse {
  service: Service;
}

export interface CreateServiceData {
  name: string;
  description?: string;
  price: number;
  duration: number;
}

export const servicesService = {
  getServices: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
  }): Promise<ServicesResponse> => {
    const response = await api.get('/services', { params });
    return response.data;
  },

  getService: async (id: string): Promise<ServiceResponse> => {
    const response = await api.get(`/services/${id}`);
    return response.data;
  },

  createService: async (data: CreateServiceData): Promise<ServiceResponse> => {
    const response = await api.post('/services', data);
    return response.data;
  },

  updateService: async (id: string, data: Partial<CreateServiceData>): Promise<ServiceResponse> => {
    const response = await api.put(`/services/${id}`, data);
    return response.data;
  },

  deleteService: async (id: string): Promise<{ message: string }> => {
    const response = await api.delete(`/services/${id}`);
    return response.data;
  },
};

import api from './api';
import { Customer, PaginationData, CustomerVehicle } from '../types';

export interface CustomersResponse {
  customers: Customer[];
  pagination: PaginationData;
}

export interface CustomerResponse {
  customer: Customer;
}

export interface CreateCustomerData {
  name: string;
  phone: string;
  email?: string;
  address?: string;
  vehicles?: Array<{
    id?: string;
    makeId?: string;
    modelId?: string;
    variantId?: string;
    colorId?: string;
    licensePlate?: string;
    vin?: string;
    year?: number;
    isPrimary?: boolean;
  }>;
}

export interface CustomerVehiclesResponse {
  vehicles: CustomerVehicle[];
}

export const customersService = {
  getCustomers: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
  }): Promise<CustomersResponse> => {
    const response = await api.get('/customers', { params });
    return response.data;
  },

  getCustomer: async (id: string): Promise<CustomerResponse> => {
    const response = await api.get(`/customers/${id}`);
    return response.data;
  },

  createCustomer: async (data: CreateCustomerData): Promise<CustomerResponse> => {
    const response = await api.post('/customers', data);
    return response.data;
  },

  updateCustomer: async (id: string, data: Partial<CreateCustomerData>): Promise<CustomerResponse> => {
    const response = await api.put(`/customers/${id}`, data);
    return response.data;
  },

  deleteCustomer: async (id: string): Promise<{ message: string }> => {
    const response = await api.delete(`/customers/${id}`);
    return response.data;
  },

  getCustomerVehicles: async (customerId: string): Promise<CustomerVehiclesResponse> => {
    const response = await api.get(`/customers/${customerId}/vehicles`);
    return response.data;
  },

  addCustomerVehicle: async (customerId: string, vehicleData: {
    makeId?: string;
    modelId?: string;
    variantId?: string;
    colorId?: string;
    licensePlate?: string;
    vin?: string;
    year?: number;
    isPrimary?: boolean;
  }): Promise<{ vehicle: CustomerVehicle }> => {
    const response = await api.post(`/customers/${customerId}/vehicles`, vehicleData);
    return response.data;
  },

  updateCustomerVehicle: async (customerId: string, vehicleId: string, vehicleData: {
    makeId?: string;
    modelId?: string;
    variantId?: string;
    colorId?: string;
    licensePlate?: string;
    vin?: string;
    year?: number;
    isPrimary?: boolean;
  }): Promise<{ vehicle: CustomerVehicle }> => {
    const response = await api.put(`/customers/${customerId}/vehicles/${vehicleId}`, vehicleData);
    return response.data;
  },

  deleteCustomerVehicle: async (customerId: string, vehicleId: string): Promise<{ message: string }> => {
    const response = await api.delete(`/customers/${customerId}/vehicles/${vehicleId}`);
    return response.data;
  },
};

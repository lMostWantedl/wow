import api from './api';
import { JobCard, CreateJobCardData, UpdateJobCardData } from '../types';

export interface JobCardsResponse {
  jobCards: JobCard[];
}

export interface JobCardResponse {
  jobCard: JobCard;
}

export const jobCardsService = {
  getJobCards: async (params?: {
    status?: string;
    search?: string;
    priority?: string;
  }): Promise<JobCardsResponse> => {
    const response = await api.get('/job-cards', { params });
    return response.data;
  },

  getJobCard: async (id: string): Promise<JobCardResponse> => {
    const response = await api.get(`/job-cards/${id}`);
    return response.data;
  },

  createJobCard: async (data: CreateJobCardData): Promise<{ message: string; jobCard: JobCard }> => {
    const response = await api.post('/job-cards', data);
    return response.data;
  },

  updateJobCard: async (id: string, data: UpdateJobCardData): Promise<{ message: string; jobCard: JobCard }> => {
    const response = await api.put(`/job-cards/${id}`, data);
    return response.data;
  },

  addService: async (id: string, data: {
    serviceId?: string;
    serviceName?: string;
    serviceType?: 'LABOR' | 'EXTERNAL_SERVICE';
    vendorName?: string;
    costPrice?: number;
    description?: string;
    hoursQty?: number;
    unitPrice?: number;
    isExtraWork?: boolean;
    technicianId?: string;
    technicianIds?: string[];
  }): Promise<any> => {
    const response = await api.post(`/job-cards/${id}/services`, data);
    return response.data;
  },

  updateService: async (id: string, serviceId: string, data: {
    serviceName?: string;
    serviceType?: 'LABOR' | 'EXTERNAL_SERVICE';
    vendorName?: string;
    costPrice?: number;
    description?: string;
    hoursQty?: number;
    unitPrice?: number;
    isExtraWork?: boolean;
    technicianId?: string;
    technicianIds?: string[];
  }): Promise<any> => {
    const response = await api.put(`/job-cards/${id}/services/${serviceId}`, data);
    return response.data;
  },

  removeService: async (id: string, serviceId: string): Promise<any> => {
    const response = await api.delete(`/job-cards/${id}/services/${serviceId}`);
    return response.data;
  },

  addSparePart: async (id: string, data: {
    sparePartId?: string;
    partName?: string;
    partNumber?: string;
    description?: string;
    quantity?: number;
    unit?: string;
    unitPrice?: number;
    isExtraWork?: boolean;
  }): Promise<any> => {
    const response = await api.post(`/job-cards/${id}/spare-parts`, data);
    return response.data;
  },

  updateSparePart: async (id: string, partId: string, data: {
    partName?: string;
    partNumber?: string;
    description?: string;
    quantity?: number;
    unit?: string;
    unitPrice?: number;
    isExtraWork?: boolean;
  }): Promise<any> => {
    const response = await api.put(`/job-cards/${id}/spare-parts/${partId}`, data);
    return response.data;
  },

  removeSparePart: async (id: string, partId: string): Promise<any> => {
    const response = await api.delete(`/job-cards/${id}/spare-parts/${partId}`);
    return response.data;
  },

  convertToInvoice: async (id: string, data?: {
    discountAmount?: number;
    taxRate?: number;
    notes?: string;
  }): Promise<{ message: string; bill: any; billId: string }> => {
    const response = await api.post(`/job-cards/${id}/convert-to-invoice`, data || {});
    return response.data;
  },

  revertInvoice: async (id: string): Promise<{ message: string; jobCard: JobCard }> => {
    const response = await api.post(`/job-cards/${id}/revert-invoice`);
    return response.data;
  },

  deleteJobCard: async (id: string): Promise<{ message: string }> => {
    const response = await api.delete(`/job-cards/${id}`);
    return response.data;
  },

  procureSparePart: async (id: string, partId: string, data: {
    procuredCost: number;
    vendorName?: string;
    paymentMethod?: string;
    invoiceRef?: string;
    notes?: string;
  }): Promise<any> => {
    const response = await api.post(`/job-cards/${id}/spare-parts/${partId}/procure`, data);
    return response.data;
  },

  unprocureSparePart: async (id: string, partId: string): Promise<any> => {
    const response = await api.delete(`/job-cards/${id}/spare-parts/${partId}/procure`);
    return response.data;
  },

  procureService: async (id: string, serviceId: string, data: {
    procuredCost: number;
    vendorName?: string;
    paymentMethod?: string;
    invoiceRef?: string;
    notes?: string;
  }): Promise<any> => {
    const response = await api.post(`/job-cards/${id}/services/${serviceId}/procure`, data);
    return response.data;
  },

  unprocureService: async (id: string, serviceId: string): Promise<any> => {
    const response = await api.delete(`/job-cards/${id}/services/${serviceId}/procure`);
    return response.data;
  }
};

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
    description?: string;
    hoursQty?: number;
    unitPrice?: number;
    isExtraWork?: boolean;
    technicianId?: string;
  }): Promise<any> => {
    const response = await api.post(`/job-cards/${id}/services`, data);
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
  }
};

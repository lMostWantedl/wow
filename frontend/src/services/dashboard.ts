import api from './api';
import { DashboardData } from '../types';

export interface StatisticsResponse {
  statistics: {
    labels: string[];
    revenue: number[];
    billCount: number[];
  };
}

export const dashboardService = {
  getDashboardData: async (period?: string): Promise<DashboardData> => {
    const response = await api.get('/dashboard', { params: { period } });
    return response.data;
  },

  getStatistics: async (period?: string, type?: string): Promise<StatisticsResponse> => {
    const response = await api.get('/dashboard/statistics', { 
      params: { period, type } 
    });
    return response.data;
  },
};

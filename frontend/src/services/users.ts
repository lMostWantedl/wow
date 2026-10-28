import api from './api';
import { User, PaginationData } from '../types';

export interface UsersResponse {
  users: User[];
  pagination: PaginationData;
}

export interface UserResponse {
  user: User;
  message?: string;
}

export interface TechniciansResponse {
  technicians: User[];
}

export interface CreateUserData {
  name: string;
  phone: string;
  email?: string;
  password?: string;
  role: 'CUSTOMER' | 'TECHNICIAN' | 'MANAGER';
  scopes?: string[];
  isActive?: boolean;
  baseSalary?: number;
  base_salary?: number;
}

const normalizeUser = (u: any): User => {
  if (!u) return u;
  let scopes: string[] = [];
  if (Array.isArray(u.scopes)) {
    scopes = u.scopes;
  } else if (typeof u.scopes === 'string') {
    try {
      scopes = JSON.parse(u.scopes);
    } catch {
      scopes = [];
    }
  } else if (u.role === 'MANAGER') {
    scopes = ['dashboard', 'bills', 'customers', 'spare_parts', 'services', 'financial', 'users'];
  } else if (u.role === 'TECHNICIAN') {
    scopes = ['dashboard', 'bills', 'customers', 'spare_parts', 'services'];
  } else if (u.role === 'CUSTOMER') {
    scopes = ['bills'];
  }

  const baseSalary = Number(u.baseSalary ?? u.base_salary ?? 0);

  return {
    ...u,
    scopes,
    baseSalary,
    base_salary: baseSalary,
    isActive: u.isActive !== undefined ? Boolean(u.isActive) : (u.is_active !== undefined ? Boolean(u.is_active) : true),
    createdAt: u.createdAt || u.created_at || '',
    updatedAt: u.updatedAt || u.updated_at || '',
  };
};

export const usersService = {
  getUsers: async (params?: {
    page?: number;
    limit?: number;
    role?: string;
    search?: string;
  }): Promise<UsersResponse> => {
    const response = await api.get('/users', { params });
    const users = Array.isArray(response.data?.users) 
      ? response.data.users.map(normalizeUser) 
      : [];
    const pagination = response.data?.pagination || {
      page: params?.page || 1,
      limit: params?.limit || 10,
      total: users.length,
      pages: Math.ceil(users.length / (params?.limit || 10)) || 1
    };
    return { users, pagination };
  },

  getUser: async (id: string): Promise<UserResponse> => {
    const response = await api.get(`/users/${id}`);
    return {
      user: normalizeUser(response.data?.user),
      message: response.data?.message
    };
  },

  getTechnicians: async (): Promise<TechniciansResponse> => {
    const response = await api.get('/users/technicians');
    const technicians = Array.isArray(response.data?.technicians)
      ? response.data.technicians.map(normalizeUser)
      : [];
    return { technicians };
  },

  createUser: async (data: CreateUserData): Promise<UserResponse> => {
    const response = await api.post('/users', data);
    return {
      user: normalizeUser(response.data?.user),
      message: response.data?.message
    };
  },

  updateUser: async (id: string, data: Partial<CreateUserData>): Promise<UserResponse> => {
    const response = await api.put(`/users/${id}`, data);
    return {
      user: normalizeUser(response.data?.user),
      message: response.data?.message
    };
  },

  deactivateUser: async (id: string): Promise<UserResponse> => {
    const response = await api.patch(`/users/${id}/deactivate`);
    return {
      user: normalizeUser(response.data?.user),
      message: response.data?.message
    };
  },

  activateUser: async (id: string): Promise<UserResponse> => {
    const response = await api.patch(`/users/${id}/activate`);
    return {
      user: normalizeUser(response.data?.user),
      message: response.data?.message
    };
  },

  deleteUser: async (id: string): Promise<{ message: string }> => {
    const response = await api.delete(`/users/${id}`);
    return response.data;
  },
};

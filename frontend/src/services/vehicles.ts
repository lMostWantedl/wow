import api from './api';
import { DecodedVinData } from '../types';

export interface VehicleMake {
  id: string;
  name: string;
  country?: string;
  logo_url?: string;
  created_at: string;
}

export interface VehicleModel {
  id: string;
  make_id: string;
  name: string;
  year_start?: number;
  year_end?: number;
  body_type?: string;
  created_at: string;
}

export interface VehicleVariant {
  id: string;
  model_id: string;
  name: string;
  variant_code?: string;
  engine_type?: string;
  engine_capacity?: string;
  transmission?: string;
  fuel_type?: string;
  power_bhp?: number;
  torque_nm?: number;
  seating_capacity?: number;
  fuel_tank_capacity?: number;
  ground_clearance?: number;
  boot_space?: number;
  ecm?: string;
  created_at: string;
}

export interface VehicleColor {
  id: string;
  variant_id: string;
  name: string;
  color_code?: string;
  color_type?: string;
  created_at: string;
}

export interface VehicleMakesResponse {
  makes: VehicleMake[];
}

export interface VehicleModelsResponse {
  models: VehicleModel[];
}

export interface VehicleVariantsResponse {
  variants: VehicleVariant[];
}

export interface VehicleColorsResponse {
  colors: VehicleColor[];
}

export interface CreateMakeData {
  name: string;
  country?: string;
  logo_url?: string;
}

export interface CreateModelData {
  make_id: string;
  name: string;
  year_start?: number;
  year_end?: number;
  body_type?: string;
}

export interface CreateVariantData {
  model_id: string;
  name: string;
  variant_code?: string;
  engine_type?: string;
  engine_capacity?: string;
  transmission?: string;
  fuel_type?: string;
  power_bhp?: number;
  torque_nm?: number;
  seating_capacity?: number;
  fuel_tank_capacity?: number;
  ground_clearance?: number;
  boot_space?: number;
}

export interface CreateColorData {
  variant_id: string;
  name: string;
  color_code?: string;
  color_type?: string;
}

export const vehiclesService = {
  getMakes: async (): Promise<VehicleMakesResponse> => {
    const response = await api.get('/vehicles/makes');
    return response.data;
  },

  getModels: async (makeId: string): Promise<VehicleModelsResponse> => {
    const response = await api.get(`/vehicles/makes/${makeId}/models`);
    return response.data;
  },

  getVariants: async (modelId: string): Promise<VehicleVariantsResponse> => {
    const response = await api.get(`/vehicles/models/${modelId}/variants`);
    return response.data;
  },

  getColors: async (variantId: string): Promise<VehicleColorsResponse> => {
    const response = await api.get(`/vehicles/variants/${variantId}/colors`);
    return response.data;
  },

  decodeVin: async (vin: string): Promise<DecodedVinData> => {
    const response = await api.get(`/vehicles/vin-decode/${encodeURIComponent(vin.trim())}`);
    return response.data;
  },

  createMake: async (data: CreateMakeData): Promise<{ make: VehicleMake }> => {
    const response = await api.post('/vehicles/makes', data);
    return response.data;
  },

  createModel: async (data: CreateModelData): Promise<{ model: VehicleModel }> => {
    const response = await api.post('/vehicles/models', data);
    return response.data;
  },

  createVariant: async (data: CreateVariantData): Promise<{ variant: VehicleVariant }> => {
    const response = await api.post('/vehicles/variants', data);
    return response.data;
  },

  createColor: async (data: CreateColorData): Promise<{ color: VehicleColor }> => {
    const response = await api.post('/vehicles/colors', data);
    return response.data;
  },
};

import api from './client';
import type {
  ApiSuccessResponse,
  Service,
  CreateServiceRequest,
  PaginationParams
} from '../types/api';

export const servicesApi = {
  /**
   * Get services list with pagination
   */
  getServices: (params?: {
    page?: number;
    limit?: number;
    search?: string;
    isActive?: boolean;
  }) => 
    api.get<ApiSuccessResponse<Service[]>>('/api/services', params),

  /**
   * Get single service by ID
   */
  getService: (id: string) => 
    api.get<ApiSuccessResponse<Service>>(`/api/services/${id}`),

  /**
   * Create new service
   */
  createService: (data: CreateServiceRequest) => 
    api.post<ApiSuccessResponse<Service>>('/api/services', data),

  /**
   * Update service
   */
  updateService: (id: string, data: Partial<CreateServiceRequest>) => 
    api.patch<ApiSuccessResponse<Service>>(`/api/services/${id}`, data),

  /**
   * Delete service
   */
  deleteService: (id: string) => 
    api.delete<ApiSuccessResponse<{ success: boolean }>>(`/api/services/${id}`),

  /**
   * Activate/deactivate service
   */
  toggleService: (id: string, isActive: boolean) => 
    api.patch<ApiSuccessResponse<Service>>(`/api/services/${id}`, { isActive }),

  /**
   * Get service statistics
   */
  getStats: () => 
    api.get<ApiSuccessResponse<{
      total: number;
      active: number;
      inactive: number;
      averageDuration: number;
      averagePrice: number;
    }>>('/api/services/stats'),

  /**
   * Get services for public booking
   */
  getPublicServices: () => 
    api.get<ApiSuccessResponse<Array<{
      id: string;
      name: string;
      durationMinutes: number;
      price?: number;
      description?: string;
    }>>>('/api/public/services'),
};

import api from './client';
import type {
  ApiSuccessResponse,
  Staff,
  CreateStaffRequest,
  PaginationParams
} from '../types/api';

export const staffApi = {
  /**
   * Get staff list with pagination
   */
  getStaff: (params?: {
    page?: number;
    limit?: number;
    search?: string;
    isActive?: boolean;
    includeServices?: boolean;
  }) => 
    api.get<ApiSuccessResponse<Staff[]>>('/api/staff', params),

  /**
   * Get single staff member by ID
   */
  getStaffMember: (id: string) => 
    api.get<ApiSuccessResponse<Staff>>(`/api/staff/${id}`),

  /**
   * Create new staff member
   */
  createStaff: (data: CreateStaffRequest) => 
    api.post<ApiSuccessResponse<Staff>>('/api/staff', data),

  /**
   * Update staff member
   */
  updateStaff: (id: string, data: Partial<CreateStaffRequest>) => 
    api.patch<ApiSuccessResponse<Staff>>(`/api/staff/${id}`, data),

  /**
   * Delete staff member
   */
  deleteStaff: (id: string) => 
    api.delete<ApiSuccessResponse<{ success: boolean }>>(`/api/staff/${id}`),

  /**
   * Activate/deactivate staff member
   */
  toggleStaff: (id: string, isActive: boolean) => 
    api.patch<ApiSuccessResponse<Staff>>(`/api/staff/${id}`, { isActive }),

  /**
   * Assign services to staff member
   */
  assignServices: (id: string, serviceIds: string[]) => 
    api.post<ApiSuccessResponse<Staff>>(`/api/staff/${id}/services`, { serviceIds }),

  /**
   * Remove services from staff member
   */
  removeServices: (id: string, serviceIds: string[]) => 
    api.delete<ApiSuccessResponse<Staff>>(`/api/staff/${id}/services`, { data: { serviceIds } }),

  /**
   * Get staff availability
   */
  getAvailability: (id: string, params?: { fromDate?: string; toDate?: string }) => 
    api.get<ApiSuccessResponse<Array<{
      date: string;
      availableSlots: Array<{
        startTimeUtc: string;
        endTimeUtc: string;
      }>;
    }>>>(`/api/staff/${id}/availability`, params),

  /**
   * Get staff statistics
   */
  getStats: () => 
    api.get<ApiSuccessResponse<{
      total: number;
      active: number;
      inactive: number;
      averageAppointmentsPerDay: number;
      utilizationRate: number;
    }>>('/api/staff/stats'),

  /**
   * Get staff for public booking
   */
  getPublicStaff: (params?: { serviceId?: string }) => 
    api.get<ApiSuccessResponse<Array<{
      id: string;
      name: string;
      email?: string;
      role?: string;
      services?: Array<{
        id: string;
        name: string;
        durationMinutes: number;
      }>;
    }>>>('/api/public/staff', params),

  /**
   * Upload staff photo
   */
  uploadPhoto: (id: string, file: File) => {
    const formData = new FormData();
    formData.append('photo', file);
    return api.post<ApiSuccessResponse<{ photoUrl: string }>>(`/api/staff/${id}/photo`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
};

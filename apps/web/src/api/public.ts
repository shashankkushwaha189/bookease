import api from './client';
import type {
  ApiSuccessResponse,
  PublicService,
  PublicStaff,
  PublicBookingRequest,
  PublicBookingResponse,
  AvailabilityRequest,
  AvailabilityResponse
} from '../types/api';

export const publicApi = {
  /**
   * Get public services
   */
  getServices: () => 
    api.get<ApiSuccessResponse<PublicService[]>>('/public/services'),

  /**
   * Get public staff
   */
  getStaff: (params?: { serviceId?: string }) => 
    api.get<ApiSuccessResponse<PublicStaff[]>>('/public/staff', params),

  /**
   * Get public availability
   */
  getAvailability: (params: AvailabilityRequest) => 
    api.get<ApiSuccessResponse<AvailabilityResponse>>('/public/availability', params),

  /**
   * Create public booking
   */
  createBooking: (data: PublicBookingRequest) => 
    api.post<ApiSuccessResponse<PublicBookingResponse>>('/public/bookings', data),

  /**
   * Get public booking by reference
   */
  getBooking: (referenceId: string) => 
    api.get<ApiSuccessResponse<PublicBookingResponse>>(`/public/bookings/${referenceId}`),

  /**
   * Cancel public booking
   */
  cancelBooking: (referenceId: string, data?: { reason?: string }) => 
    api.post<ApiSuccessResponse<{ success: boolean }>>(`/public/bookings/${referenceId}/cancel`, data),

  /**
   * Reschedule public booking
   */
  rescheduleBooking: (referenceId: string, data: { startTimeUtc: string; reason?: string }) => 
    api.post<ApiSuccessResponse<PublicBookingResponse>>(`/public/bookings/${referenceId}/reschedule`, data),

  /**
   * Get public customers (for booking)
   */
  getCustomers: (params?: { search?: string }) => 
    api.get<ApiSuccessResponse<Array<{
      id: string;
      name: string;
      email: string;
      phone?: string;
    }>>>('/public/customers', params),

  /**
   * Create public customer
   */
  createCustomer: (data: {
    name: string;
    email: string;
    phone?: string;
  }) => 
    api.post<ApiSuccessResponse<{
      id: string;
      name: string;
      email: string;
      phone?: string;
    }>>('/public/customers', data),

  /**
   * Get business profile
   */
  getBusinessProfile: () => 
    api.get<ApiSuccessResponse<{
      name: string;
      description?: string;
      phone?: string;
      email?: string;
      website?: string;
      address?: string;
      timezone: string;
      businessHours: Array<{
        dayOfWeek: number;
        isOpen: boolean;
        openTime?: string;
        closeTime?: string;
      }>;
    }>>('/public/profile'),

  /**
   * Health check
   */
  healthCheck: () => 
    api.get<ApiSuccessResponse<{
      status: 'healthy' | 'degraded' | 'unhealthy';
      timestamp: string;
      version: string;
      services: Array<{
        name: string;
        status: 'up' | 'down';
        responseTime?: number;
      }>;
    }>>('/public/health'),
};

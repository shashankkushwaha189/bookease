import api from './client';
import type {
  ApiSuccessResponse,
  Appointment,
  CreateAppointmentRequest,
  AvailabilityRequest,
  AvailabilityResponse,
  PaginationParams,
  SearchParams
} from '../types/api';

export const appointmentsApi = {
  /**
   * Get appointments list with pagination and filtering
   */
  getAppointments: (params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    serviceId?: string;
    staffId?: string;
    customerId?: string;
    fromDate?: string;
    toDate?: string;
  }) => 
    api.get<ApiSuccessResponse<{
      items: Appointment[];
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    }>>('/appointments', params),

  /**
   * Get single appointment by ID
   */
  getAppointment: (id: string) => 
    api.get<ApiSuccessResponse<Appointment>>(`/appointments/${id}`),

  /**
   * Create new appointment
   */
  createAppointment: (data: CreateAppointmentRequest) => 
    api.post<ApiSuccessResponse<Appointment>>('/appointments', data),

  /**
   * Update appointment
   */
  updateAppointment: (id: string, data: Partial<CreateAppointmentRequest>) => 
    api.patch<ApiSuccessResponse<Appointment>>(`/appointments/${id}`, data),

  /**
   * Delete/cancel appointment
   */
  deleteAppointment: (id: string) => 
    api.delete<ApiSuccessResponse<{ success: boolean }>>(`/appointments/${id}`),

  /**
   * Confirm appointment
   */
  confirmAppointment: (id: string) => 
    api.post<ApiSuccessResponse<Appointment>>(`/appointments/${id}/confirm`),

  /**
   * Reschedule appointment
   */
  rescheduleAppointment: (id: string, data: { startTimeUtc: string; reason?: string }) => 
    api.post<ApiSuccessResponse<Appointment>>(`/appointments/${id}/reschedule`, data),

  /**
   * Mark appointment as no-show
   */
  markNoShow: (id: string, data?: { reason?: string }) => 
    api.post<ApiSuccessResponse<Appointment>>(`/appointments/${id}/no-show`, data),

  /**
   * Complete appointment
   */
  completeAppointment: (id: string, data?: { notes?: string }) => 
    api.post<ApiSuccessResponse<Appointment>>(`/appointments/${id}/complete`, data),

  /**
   * Get availability for booking
   */
  getAvailability: (params: AvailabilityRequest) => 
    api.get<ApiSuccessResponse<AvailabilityResponse>>('/appointments/availability', params),

  /**
   * Get appointment timeline
   */
  getTimeline: (id: string) => 
    api.get<ApiSuccessResponse<Array<{
      id: string;
      eventType: string;
      performedBy: string;
      note?: string;
      createdAt: string;
    }>>>(`/appointments/${id}/timeline`),

  /**
   * Add note to appointment
   */
  addNote: (id: string, data: { note: string }) => 
    api.post<ApiSuccessResponse<{
      id: string;
      note: string;
      createdAt: string;
    }>>(`/appointments/${id}/notes`, data),

  /**
   * Get appointment statistics
   */
  getStats: (params?: { fromDate?: string; toDate?: string }) => 
    api.get<ApiSuccessResponse<{
      total: number;
      byStatus: Record<string, number>;
      byService: Array<{ serviceName: string; count: number }>;
      byStaff: Array<{ staffName: string; count: number }>;
    }>>('/appointments/stats', params),

  /**
   * Bulk operations on appointments
   */
  bulkUpdate: (data: {
    appointmentIds: string[];
    action: 'confirm' | 'cancel' | 'complete' | 'mark-no-show';
    reason?: string;
  }) => 
    api.post<ApiSuccessResponse<{
      updated: number;
      failed: number;
      errors: Array<{ appointmentId: string; error: string }>;
    }>>('/appointments/bulk', data),
};

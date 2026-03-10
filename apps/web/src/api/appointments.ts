import api from './client';
import type {
  ApiSuccessResponse,
  Appointment,
  CreateAppointmentRequest,
  AvailabilityRequest,
  AvailabilityResponse
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
    }>>('/api/appointments', params),

  /**
   * Get single appointment by ID
   */
  getAppointment: (id: string) => 
    api.get<ApiSuccessResponse<Appointment>>(`/api/appointments/${id}`),

  /**
   * Create new appointment (public booking)
   */
  createAppointment: (data: CreateAppointmentRequest) => 
    api.post<ApiSuccessResponse<Appointment>>('/api/appointments/book', data),

  /**
   * Create new public booking (for booking page)
   */
  createPublicBooking: (data: {
    serviceId: string;
    staffId: string;
    customer: {
      name: string;
      email: string;
      phone?: string;
    };
    startTimeUtc: string;
    endTimeUtc: string;
    sessionToken: string;
    notes?: string;
    consentGiven: boolean;
  }) => 
    api.post<ApiSuccessResponse<Appointment>>('/api/appointments/book', data),

  /**
   * Create manual booking (staff/admin only)
   */
  createManualBooking: (data: {
    serviceId: string;
    staffId: string;
    customer: {
      name: string;
      email: string;
      phone?: string;
    };
    startTimeUtc: string;
    endTimeUtc: string;
    notes?: string;
    consentGiven?: boolean;
    sessionToken?: string;
    ipAddress?: string;
  }, isPublic: boolean = false) => 
    api.post<ApiSuccessResponse<Appointment>>(isPublic ? '/api/appointments/public/manual' : '/api/appointments/manual', data),

  /**
   * Update appointment
   */
  updateAppointment: (id: string, data: Partial<CreateAppointmentRequest>) => 
    api.patch<ApiSuccessResponse<Appointment>>(`/api/appointments/${id}`, data),

  /**
   * Delete/cancel appointment
   */
  deleteAppointment: (id: string) => 
    api.delete<ApiSuccessResponse<{ success: boolean }>>(`/api/appointments/${id}`),

  /**
   * Confirm appointment
   */
  confirmAppointment: (id: string) => 
    api.post<ApiSuccessResponse<Appointment>>(`/api/appointments/${id}/confirm`),

  /**
   * Reschedule appointment
   */
  rescheduleAppointment: (id: string, data: { startTimeUtc: string; reason?: string }) => 
    api.post<ApiSuccessResponse<Appointment>>(`/api/appointments/${id}/reschedule`, data),

  /**
   * Cancel booking (new endpoint)
   */
  cancelBooking: (id: string, data?: { reason?: string }) => 
    api.delete<ApiSuccessResponse<Appointment>>(`/api/bookings/${id}`, { data }),

  /**
   * Reschedule booking (new endpoint)
   */
  rescheduleBooking: (id: string, data: { newStartTimeUtc: string; newEndTimeUtc: string; reason?: string }) => 
    api.put<ApiSuccessResponse<Appointment>>(`/api/bookings/${id}/reschedule`, data),

  /**
   * Mark appointment as no-show
   */
  markNoShow: (id: string, data?: { reason?: string }) => 
    api.post<ApiSuccessResponse<Appointment>>(`/api/appointments/${id}/no-show`, data),

  /**
   * Complete appointment
   */
  completeAppointment: (id: string, data?: { notes?: string }) => 
    api.post<ApiSuccessResponse<Appointment>>(`/api/appointments/${id}/complete`, data),

  /**
   * Get availability for booking
   */
  getAvailability: (params: AvailabilityRequest) => 
    api.get<ApiSuccessResponse<AvailabilityResponse>>('/api/appointments/availability', params),

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
    }>>>(`/api/appointments/${id}/timeline`),

  /**
   * Add note to appointment
   */
  addNote: (id: string, data: { note: string }) => 
    api.post<ApiSuccessResponse<{
      id: string;
      note: string;
      createdAt: string;
    }>>(`/api/appointments/${id}/notes`, data),

  /**
   * Get appointment statistics
   */
  getStats: (params?: { fromDate?: string; toDate?: string }) => 
    api.get<ApiSuccessResponse<{
      total: number;
      byStatus: Record<string, number>;
      byService: Array<{ serviceName: string; count: number }>;
      byStaff: Array<{ staffName: string; count: number }>;
    }>>('/api/appointments/stats', params),

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
    }>>('/api/appointments/bulk', data),
};

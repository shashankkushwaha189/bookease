import api from './client';
import type {
  ApiSuccessResponse,
  Customer,
  CreateCustomerRequest,
  PaginationParams
} from '../types/api';

export const customersApi = {
  /**
   * Get customers list with pagination
   */
  getCustomers: (params?: {
    page?: number;
    limit?: number;
    search?: string;
    tags?: string[];
  }) => 
    api.get<ApiSuccessResponse<{
      items: Customer[];
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    }>>('/api/customers', params),

  /**
   * Get single customer by ID
   */
  getCustomer: (id: string) => 
    api.get<ApiSuccessResponse<Customer>>(`/api/customers/${id}`),

  /**
   * Create new customer
   */
  createCustomer: (data: CreateCustomerRequest, isPublic: boolean = false) => 
    api.post<ApiSuccessResponse<Customer>>(isPublic ? '/api/customers/public' : '/api/customers', data),

  /**
   * Update customer
   */
  updateCustomer: (id: string, data: Partial<CreateCustomerRequest>) => 
    api.patch<ApiSuccessResponse<Customer>>(`/api/customers/${id}`, data),

  /**
   * Delete customer
   */
  deleteCustomer: (id: string) => 
    api.delete<ApiSuccessResponse<{ success: boolean }>>(`/api/customers/${id}`),

  /**
   * Get customer appointments
   */
  getCustomerAppointments: (id: string, params?: {
    page?: number;
    limit?: number;
    status?: string;
    fromDate?: string;
    toDate?: string;
  }) => 
    api.get<ApiSuccessResponse<{
      items: Array<{
        id: string;
        referenceId: string;
        startTimeUtc: string;
        endTimeUtc: string;
        status: string;
        service: { id: string; name: string };
        staff: { id: string; name: string };
      }>;
      total: number;
      page: number;
      limit: number;
    }>>(`/api/customers/${id}/appointments`, params),

  /**
   * Get customer statistics
   */
  getStats: () => 
    api.get<ApiSuccessResponse<{
      total: number;
      active: number;
      newThisMonth: number;
      averageAppointmentsPerCustomer: number;
      topCustomers: Array<{
        customerId: string;
        name: string;
        appointmentCount: number;
      }>;
    }>>('/api/customers/stats'),

  /**
   * Get all customer tags
   */
  getTags: () => 
    api.get<ApiSuccessResponse<Array<{
      tag: string;
      count: number;
    }>>>('/api/customers/tags'),

  /**
   * Add tag to customer
   */
  addTag: (id: string, tag: string) => 
    api.post<ApiSuccessResponse<Customer>>(`/api/customers/${id}/tags`, { tag }),

  /**
   * Remove tag from customer
   */
  removeTag: (id: string, tag: string) => 
    api.delete<ApiSuccessResponse<Customer>>(`/api/customers/${id}/tags/${tag}`),

  /**
   * Get customer for public booking
   */
  getPublicCustomers: (params?: { search?: string }) => 
    api.get<ApiSuccessResponse<Array<{
      id: string;
      name: string;
      email: string;
      phone?: string;
    }>>>('/public/customers', params),
};

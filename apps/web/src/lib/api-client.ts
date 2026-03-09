// 🌐 Tenant-Aware API Client
import { Tenant, BusinessProfile } from './tenant';

// API configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// API response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Request configuration
export interface RequestConfig {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers?: Record<string, string>;
  body?: any;
  params?: Record<string, string>;
  timeout?: number;
}

// Tenant-aware API client
export class TenantApiClient {
  private tenant: Tenant | null = null;
  private profile: BusinessProfile | null = null;

  constructor() {
    // Will be updated by TenantProvider
  }

  /**
   * Set current tenant and profile
   */
  setTenant(tenant: Tenant | null, profile: BusinessProfile | null = null) {
    this.tenant = tenant;
    this.profile = profile;
  }

  /**
   * Get current tenant
   */
  getTenant(): Tenant | null {
    return this.tenant;
  }

  /**
   * Get current profile
   */
  getProfile(): BusinessProfile | null {
    return this.profile;
  }

  /**
   * Make API request with tenant context
   */
  async request<T = any>(
    endpoint: string,
    config: RequestConfig = {}
  ): Promise<ApiResponse<T>> {
    const {
      method = 'GET',
      headers = {},
      body,
      params,
      timeout = 10000,
    } = config;

    // Build URL
    let url = `${API_BASE_URL}${endpoint}`;
    
    // Add query parameters
    if (params) {
      const searchParams = new URLSearchParams(params);
      url += `?${searchParams.toString()}`;
    }

    // Prepare headers
    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...headers,
    };

    // Add tenant headers if tenant is available
    if (this.tenant) {
      requestHeaders['X-Tenant-ID'] = this.tenant.id;
      requestHeaders['X-Tenant-Slug'] = this.tenant.slug;
      if (this.tenant.domain) {
        requestHeaders['X-Tenant-Domain'] = this.tenant.domain;
      }
    }

    // Prepare request options
    const requestOptions: RequestInit = {
      method,
      headers: requestHeaders,
    };

    // Add body for non-GET requests
    if (body && method !== 'GET') {
      requestOptions.body = JSON.stringify(body);
    }

    // Add timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    requestOptions.signal = controller.signal;

    try {
      const response = await fetch(url, requestOptions);
      clearTimeout(timeoutId);

      // Handle HTTP errors
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      // Parse response
      const data = await response.json();
      return data;
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error('Request timeout');
        }
        throw error;
      }
      
      throw new Error('Network error');
    }
  }

  // Convenience methods
  async get<T = any>(endpoint: string, params?: Record<string, string>): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'GET', params });
  }

  async post<T = any>(endpoint: string, body?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'POST', body });
  }

  async put<T = any>(endpoint: string, body?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'PUT', body });
  }

  async patch<T = any>(endpoint: string, body?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'PATCH', body });
  }

  async delete<T = any>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

// Create singleton instance
export const apiClient = new TenantApiClient();

// API service classes
export class TenantApiService {
  /**
   * Get all public tenants
   */
  static async getPublicTenants() {
    return apiClient.get<Tenant[]>('/api/tenants/public');
  }

  /**
   * Get tenant by slug
   */
  static async getTenantBySlug(slug: string) {
    return apiClient.get<Tenant>(`/api/tenants/public/slug/${slug}`);
  }

  /**
   * Get tenant by domain
   */
  static async getTenantByDomain(domain: string) {
    return apiClient.get<Tenant>(`/api/tenants/public/domain/${domain}`);
  }

  /**
   * Search tenants
   */
  static async searchTenants(query: string, limit = 10) {
    return apiClient.get<Tenant[]>('/api/tenants/public/search', { q: query, limit: limit.toString() });
  }

  /**
   * Validate tenant access
   */
  static async validateTenantAccess(tenantSlug?: string) {
    return apiClient.get<{ isValid: boolean; tenantId: string }>('/api/tenants/validate', { tenantSlug: tenantSlug || '' });
  }
}

export class BusinessProfileApiService {
  /**
   * Get public business profile by tenant slug
   */
  static async getPublicProfile(tenantSlug: string) {
    return apiClient.get<BusinessProfile>(`/api/business-profile/public/slug/${tenantSlug}`);
  }

  /**
   * Get all public business profiles
   */
  static async getPublicProfiles(limit = 50) {
    return apiClient.get<BusinessProfile[]>('/api/business-profile/public/all', { limit: limit.toString() });
  }

  /**
   * Search business profiles
   */
  static async searchProfiles(query: string, limit = 10) {
    return apiClient.get<BusinessProfile[]>('/api/business-profile/public/search', { q: query, limit: limit.toString() });
  }

  // Protected endpoints (require authentication)
  /**
   * Get current tenant's business profile
   */
  static async getProfile() {
    return apiClient.get<BusinessProfile>('/api/business-profile');
  }

  /**
   * Create or update business profile
   */
  static async upsertProfile(profile: Partial<BusinessProfile>) {
    return apiClient.post<BusinessProfile>('/api/business-profile', profile);
  }

  /**
   * Update business profile
   */
  static async updateProfile(profile: Partial<BusinessProfile>) {
    return apiClient.patch<BusinessProfile>('/api/business-profile', profile);
  }

  /**
   * Update branding
   */
  static async updateBranding(branding: { brandColor?: string; accentColor?: string; logoUrl?: string }) {
    return apiClient.patch<BusinessProfile>('/api/business-profile/branding', branding);
  }

  /**
   * Update policy
   */
  static async updatePolicy(policy: { policyText?: string }) {
    return apiClient.patch<BusinessProfile>('/api/business-profile/policy', policy);
  }

  /**
   * Update SEO
   */
  static async updateSEO(seo: { seoTitle?: string; seoDescription?: string }) {
    return apiClient.patch<BusinessProfile>('/api/business-profile/seo', seo);
  }

  /**
   * Update contact information
   */
  static async updateContact(contact: { phone?: string; email?: string; address?: string }) {
    return apiClient.patch<BusinessProfile>('/api/business-profile/contact', contact);
  }

  /**
   * Validate profile access
   */
  static async validateProfileAccess() {
    return apiClient.get<{ isValid: boolean; tenantId: string }>('/api/business-profile/validate');
  }
}

export class ServicesApiService {
  /**
   * Get public services for current tenant
   */
  static async getPublicServices() {
    return apiClient.get<any[]>('/api/public/services');
  }

  /**
   * Get services for current tenant (protected)
   */
  static async getServices() {
    return apiClient.get<any[]>('/api/services');
  }
}

export class StaffApiService {
  /**
   * Get public staff for current tenant
   */
  static async getPublicStaff() {
    return apiClient.get<any[]>('/api/public/staff');
  }

  /**
   * Get staff for current tenant (protected)
   */
  static async getStaff() {
    return apiClient.get<any[]>('/api/staff');
  }
}

export class AvailabilityApiService {
  /**
   * Get availability for public booking
   */
  static async getPublicAvailability(params: { serviceId: string; date: string; staffId?: string }) {
    return apiClient.get<any>('/api/public/availability', params);
  }

  /**
   * Get availability (protected)
   */
  static async getAvailability(params: { serviceId: string; date: string; staffId?: string }) {
    return apiClient.get<any>('/api/availability', params);
  }
}

export class BookingApiService {
  /**
   * Create public booking
   */
  static async createPublicBooking(bookingData: {
    serviceId: string;
    staffId: string;
    customer: {
      name: string;
      email: string;
      phone?: string;
    };
    startTimeUtc: string;
    endTimeUtc: string;
    consentGiven: boolean;
    notes?: string;
    sessionToken: string;
  }) {
    return apiClient.post<any>('/api/public/bookings/book', bookingData);
  }

  /**
   * Create booking (protected)
   */
  static async createBooking(bookingData: any) {
    return apiClient.post<any>('/api/appointments/book', bookingData);
  }

  /**
   * Get bookings (protected)
   */
  static async getBookings(params?: { page?: number; limit?: number; status?: string }) {
    return apiClient.get<any[]>('/api/appointments', params);
  }
}

// Export default API client
export default apiClient;

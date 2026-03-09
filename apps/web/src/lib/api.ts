// 🌐 API Client for BookEase Frontend

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const apiClient = {
  get: async (url: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}${url}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('API GET error:', error);
      throw error;
    }
  },
  
  post: async (url: string, data: any) => {
    try {
      const response = await fetch(`${API_BASE_URL}${url}`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('API POST error:', error);
      throw error;
    }
  },
  
  put: async (url: string, data: any) => {
    try {
      const response = await fetch(`${API_BASE_URL}${url}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('API PUT error:', error);
      throw error;
    }
  },
  
  delete: async (url: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}${url}`, {
        method: 'DELETE'
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('API DELETE error:', error);
      throw error;
    }
  }
};

// 📍 API Endpoints
export const API_ENDPOINTS = {
  // Health and status
  HEALTH: `${API_BASE_URL}/health`,
  
  // Tenant endpoints
  TENANTS: `${API_BASE_URL}/api/tenants`,
  TENANT_PUBLIC: `${API_BASE_URL}/api/tenants/public`,
  TENANT_BY_SLUG: (slug: string) => `${API_BASE_URL}/api/tenants/public/slug/${slug}`,
  
  // Business profile endpoints
  BUSINESS_PROFILE: `${API_BASE_URL}/api/business-profile`,
  BUSINESS_PROFILE_PUBLIC: `${API_BASE_URL}/api/business-profile/public`,
  BUSINESS_PROFILE_BY_SLUG: (slug: string) => `${API_BASE_URL}/api/business-profile/public/slug/${slug}`,
  
  // Service endpoints
  SERVICES: `${API_BASE_URL}/api/services`,
  SERVICES_PUBLIC: `${API_BASE_URL}/api/public/services`,
  
  // Staff endpoints
  STAFF: `${API_BASE_URL}/api/staff`,
  STAFF_PUBLIC: `${API_BASE_URL}/api/public/staff`,
  
  // Availability endpoints
  AVAILABILITY: `${API_BASE_URL}/api/availability`,
  AVAILABILITY_PUBLIC: `${API_BASE_URL}/api/public/availability`,
  
  // Appointment endpoints
  APPOINTMENTS: `${API_BASE_URL}/api/appointments`,
  APPOINTMENTS_PUBLIC: `${API_BASE_URL}/api/public/bookings`,
  
  // Customer endpoints
  CUSTOMERS: `${API_BASE_URL}/api/customers`,
  
  // Config endpoints
  CONFIG: `${API_BASE_URL}/api/config`,
  
  // Reports endpoints
  REPORTS: `${API_BASE_URL}/api/reports`,
  
  // Audit endpoints
  AUDIT: `${API_BASE_URL}/api/audit`
};

// 🛠️ Utility functions
export const apiUtils = {
  // Check if API is reachable
  checkHealth: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/health`);
      return response.ok;
    } catch {
      return false;
    }
  },
  
  // Get API base URL
  getBaseUrl: () => API_BASE_URL,
  
  // Handle API errors consistently
  handleError: (error: any, defaultMessage: string = 'An error occurred') => {
    console.error('API Error:', error);
    if (error?.message?.includes('fetch')) {
      return 'Network error. Please check your connection.';
    }
    if (error?.message?.includes('JSON')) {
      return 'Invalid response from server.';
    }
    return error?.message || defaultMessage;
  }
};

// 📊 Debug information
console.log('🔧 API Configuration:', {
  baseUrl: API_BASE_URL,
  environment: import.meta.env.MODE,
  isProduction: import.meta.env.PROD
});

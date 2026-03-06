// Common types used across the application

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
  message?: string;
}

export interface PaginatedResponse<T = any> {
  success: boolean;
  data: {
    items: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface User {
  id: string;
  email: string;
  role: string;
  firstName?: string;
  lastName?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  timezone: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Service {
  id: string;
  name: string;
  description?: string;
  durationMinutes: number;
  bufferBefore: number;
  bufferAfter: number;
  price: number;
  color?: string;
  category?: string;
  isActive: boolean;
  tenantId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Staff {
  id: string;
  name: string;
  email: string;
  role: string;
  specialization?: string;
  phone?: string;
  bio?: string;
  isActive: boolean;
  tenantId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone?: string;
  dateOfBirth?: string;
  address?: string;
  emergencyContact?: string;
  medicalHistory?: string;
  allergies?: string;
  bloodType?: string;
  tenantId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Appointment {
  id: string;
  referenceId: string;
  serviceId: string;
  staffId: string;
  customerId: string;
  startTimeUtc: Date;
  endTimeUtc: Date;
  status: string;
  notes?: string;
  tenantId: string;
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AISummary {
  id: string;
  appointmentId: string;
  tenantId: string;
  summary: string;
  customerIntent?: string;
  followUpSuggestion?: string;
  confidence: number;
  keyPoints?: string[];
  sentimentScore?: number;
  sentimentLabel?: string;
  sentimentConfidence?: number;
  model: string;
  processingTime: number;
  accepted?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Enhanced API types for all backend endpoints
export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  meta?: {
    duration?: string;
    page?: number;
    limit?: number;
    totalPages?: number;
    total?: number;
    performanceRequirement?: string;
    isNonBlocking?: boolean;
    noDataLoss?: boolean;
    safeHandling?: boolean;
    fileSize?: string;
    rateLimitRemaining?: number;
  };
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
  };
}

// Auth Types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: {
    id: string;
    email: string;
    role: string;
    tenantId: string;
  };
}

// Appointment Types
export interface Appointment {
  id: string;
  referenceId: string;
  customerId: string;
  serviceId: string;
  staffId: string;
  startTimeUtc: string;
  endTimeUtc: string;
  status: 'BOOKED' | 'CONFIRMED' | 'CANCELLED' | 'NO_SHOW' | 'COMPLETED';
  notes?: string;
  createdAt: string;
  updatedAt: string;
  customer?: {
    id: string;
    name: string;
    email: string;
    phone?: string;
  };
  service?: {
    id: string;
    name: string;
    durationMinutes: number;
    price?: number;
  };
  staff?: {
    id: string;
    name: string;
    email: string;
  };
}

export interface CreateAppointmentRequest {
  serviceId: string;
  staffId: string;
  customerId: string;
  startTimeUtc: string;
  notes?: string;
}

export interface AvailabilityRequest {
  serviceId: string;
  staffId: string;
  date: string; // YYYY-MM-DD
}

export interface AvailabilityResponse {
  date: string;
  availableSlots: Array<{
    startTimeUtc: string;
    endTimeUtc: string;
    isAvailable: boolean;
  }>;
}

// Service Types
export interface Service {
  id: string;
  name: string;
  durationMinutes: number;
  bufferBefore: number;
  bufferAfter: number;
  price?: number;
  description?: string;
  category: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateServiceRequest {
  name: string;
  durationMinutes: number;
  bufferBefore?: number;
  bufferAfter?: number;
  price?: number;
  description?: string;
  category?: string;
  isActive?: boolean;
}

// Staff Types
export interface Staff {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  services?: Service[];
}

export interface CreateStaffRequest {
  name: string;
  email: string;
  phone?: string;
  role?: string;
  serviceIds?: string[];
}

// Customer Types
export interface Customer {
  id: string;
  name: string;
  email: string;
  phone?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateCustomerRequest {
  name: string;
  email: string;
  phone?: string;
  tags?: string[];
}

// Timeline Types
export interface TimelineEvent {
  id: string;
  appointmentId: string;
  eventType: 'CREATED' | 'CONFIRMED' | 'RESCHEDULED' | 'CANCELLED' | 'COMPLETED' | 'NO_SHOW_MARKED' | 'NOTE_ADDED' | 'AI_SUMMARY_GENERATED';
  performedBy: string;
  note?: string;
  metadata?: any;
  createdAt: string;
}

export interface TimelineQuery {
  fromDate: string;
  toDate: string;
  page?: number;
  limit?: number;
  eventType?: string;
}

// Audit Types
export interface AuditLog {
  id: string;
  tenantId: string;
  userId?: string;
  action: string;
  resourceType: string;
  resourceId: string;
  correlationId: string;
  before?: any;
  after?: any;
  ipAddress?: string;
  reason?: string;
  createdAt: string;
}

export interface AuditQuery {
  fromDate?: string;
  toDate?: string;
  action?: string;
  resourceType?: string;
  userId?: string;
  page?: number;
  limit?: number;
}

// Report Types
export interface ReportSummary {
  totalAppointments: number;
  completedCount: number;
  cancelledCount: number;
  noShowCount: number;
  noShowRate: number;
  bookingsByService: Array<{
    name: string;
    count: number;
    percentage: number;
  }>;
  bookingsByStaff: Array<{
    name: string;
    count: number;
    percentage: number;
  }>;
  revenueByService?: Array<{
    name: string;
    revenue: number;
  }>;
}

export interface PeakTimeData {
  dayOfWeek: number;
  hour: number;
  count: number;
  percentage: number;
}

export interface StaffUtilization {
  staffId: string;
  name: string;
  totalSlots: number;
  bookedSlots: number;
  utilizationPct: number;
  efficiency: number;
}

export interface ReportQuery {
  fromDate: string;
  toDate: string;
  serviceId?: string;
  staffId?: string;
  status?: string;
  page?: number;
  limit?: number;
}

// Archive Types
export interface ArchivedAppointment {
  id: string;
  referenceId: string;
  customerName: string;
  serviceName: string;
  staffName: string;
  startTimeUtc: string;
  endTimeUtc: string;
  status: string;
  notes?: string;
  archivedAt: string;
  originalCreatedAt: string;
}

export interface ArchiveQuery {
  search?: string;
  page?: number;
  limit?: number;
}

export interface ArchiveStats {
  totalArchived: number;
  archivedByMonth: Array<{
    month: string;
    count: number;
  }>;
  archivedByService: Array<{
    serviceName: string;
    count: number;
  }>;
  oldestArchiveDate: string | null;
  newestArchiveDate: string | null;
}

// Import Types
export interface ImportResult {
  imported: number;
  failed: number;
  skipped: number;
  errors: Array<{
    row: number;
    field: string;
    message: string;
    severity: 'error' | 'warning';
  }>;
  warnings: Array<{
    row: number;
    field: string;
    message: string;
  }>;
  summary: {
    totalRows: number;
    validRows: number;
    invalidRows: number;
    processingTime: number;
  };
}

export interface RowValidationReport {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  errors: Array<{
    row: number;
    field: string;
    message: string;
    severity: 'error' | 'warning';
    value?: string;
  }>;
  warnings: Array<{
    row: number;
    field: string;
    message: string;
    value?: string;
  }>;
  canPartialImport: boolean;
  estimatedImportTime: number;
}

export interface ImportTemplate {
  headers: string[];
  example: string[][];
  description: string;
  requiredFields: string[];
  optionalFields: string[];
}

export interface ImportTemplates {
  customers: ImportTemplate;
  services: ImportTemplate;
  staff: ImportTemplate;
}

// API Token Types
export interface ApiTokenResult {
  id: string;
  name: string;
  token: string; // Only returned once on creation
  createdAt: string;
  lastUsed?: string;
  expiresAt?: string;
  isActive: boolean;
}

export interface ApiTokenInfo {
  id: string;
  name: string;
  lastUsed?: string;
  expiresAt?: string;
  isActive: boolean;
  createdAt: string;
  usageCount?: number;
}

export interface CreateApiTokenRequest {
  name: string;
  expiresAt?: string;
  permissions?: string[];
}

export interface UpdateApiTokenRequest {
  name?: string;
  expiresAt?: string | null;
  isActive?: boolean;
  permissions?: string[];
}

export interface TokenUsageStats {
  totalUsage: number;
  dailyUsage: Array<{
    date: string;
    count: number;
  }>;
  topEndpoints: Array<{
    endpoint: string;
    count: number;
  }>;
  rateLimitHits: number;
}

// Public Booking API Types (for external integrations)
export interface PublicService {
  id: string;
  name: string;
  durationMinutes: number;
  price?: number;
  description?: string;
}

export interface PublicStaff {
  id: string;
  name: string;
  email?: string;
  role?: string;
  services?: PublicService[];
}

export interface PublicBookingRequest {
  serviceId: string;
  staffId: string;
  customerId: string;
  startTimeUtc: string;
  notes?: string;
}

export interface PublicBookingResponse {
  id: string;
  referenceId: string;
  status: string;
  startTimeUtc: string;
  endTimeUtc: string;
  service: PublicService;
  staff: PublicStaff;
  customer: {
    id: string;
    name: string;
    email: string;
  };
}

// AI Types
export interface AISummary {
  id: string;
  appointmentId: string;
  summary: string;
  keyPoints: string[];
  actionItems: string[];
  sentiment: 'positive' | 'neutral' | 'negative';
  confidence: number;
  createdAt: string;
}

export interface GenerateAISummaryRequest {
  appointmentId: string;
  includeKeyPoints?: boolean;
  includeActionItems?: boolean;
}

// Utility Types
export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface DateRangeParams {
  fromDate: string;
  toDate: string;
}

export interface SearchParams {
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}


// Central API exports for all backend endpoints
export { authApi } from './auth';
export { appointmentsApi } from './appointments';
export { servicesApi } from './services';
export { staffApi } from './staff';
export { customersApi } from './customers';
export { reportsApi } from './reports';
export { archiveApi } from './archive';
export { importApi } from './import';
export { apiTokensApi } from './tokens';
export { auditApi } from './audit';
export { aiApi } from './ai';
export { publicApi } from './public';

// Re-export the base API client
export { default as api } from './client';

// Export all types for easy access
export type * from '../types/api';

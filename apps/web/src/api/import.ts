import api from './client';
import type {
  ApiSuccessResponse,
  ImportResult,
  RowValidationReport,
  ImportTemplates,
  PaginationParams
} from '../types/api';

export const importApi = {
  /**
   * Validate customers CSV
   */
  validateCustomers: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post<ApiSuccessResponse<RowValidationReport>>('/import/customers/validate', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },

  /**
   * Import customers
   */
  importCustomers: (file: File, options?: {
    allowPartial?: boolean;
    skipDuplicates?: boolean;
  }) => {
    const formData = new FormData();
    formData.append('file', file);
    if (options?.allowPartial) formData.append('allowPartial', 'true');
    if (options?.skipDuplicates) formData.append('skipDuplicates', 'true');
    
    return api.post<ApiSuccessResponse<ImportResult>>('/import/customers', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },

  /**
   * Validate services CSV
   */
  validateServices: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post<ApiSuccessResponse<RowValidationReport>>('/import/services/validate', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },

  /**
   * Import services
   */
  importServices: (file: File, options?: {
    allowPartial?: boolean;
    skipDuplicates?: boolean;
  }) => {
    const formData = new FormData();
    formData.append('file', file);
    if (options?.allowPartial) formData.append('allowPartial', 'true');
    if (options?.skipDuplicates) formData.append('skipDuplicates', 'true');
    
    return api.post<ApiSuccessResponse<ImportResult>>('/import/services', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },

  /**
   * Validate staff CSV
   */
  validateStaff: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post<ApiSuccessResponse<RowValidationReport>>('/import/staff/validate', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },

  /**
   * Import staff
   */
  importStaff: (file: File, options?: {
    allowPartial?: boolean;
    skipDuplicates?: boolean;
  }) => {
    const formData = new FormData();
    formData.append('file', file);
    if (options?.allowPartial) formData.append('allowPartial', 'true');
    if (options?.skipDuplicates) formData.append('skipDuplicates', 'true');
    
    return api.post<ApiSuccessResponse<ImportResult>>('/import/staff', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },

  /**
   * Get import history
   */
  getHistory: (params?: { limit?: number }) => 
    api.get<ApiSuccessResponse<{
      imports: Array<{
        id: string;
        type: string;
        status: string;
        imported: number;
        failed: number;
        skipped: number;
        createdAt: string;
        processingTime: number;
      }>;
    }>>('/import/history', params),

  /**
   * Get import templates
   */
  getTemplates: () => 
    api.get<ApiSuccessResponse<ImportTemplates>>('/import/templates'),

  /**
   * Download template CSV
   */
  downloadTemplate: (type: 'customers' | 'services' | 'staff') => 
    api.get<Blob>(`/import/templates/${type}/download`),
};

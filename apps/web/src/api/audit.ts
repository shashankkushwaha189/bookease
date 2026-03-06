import api from './client';
import type {
  ApiSuccessResponse,
  AuditLog,
  AuditQuery,
  PaginationParams
} from '../types/api';

export const auditApi = {
  /**
   * Get audit logs with filtering
   */
  getAuditLogs: (query: AuditQuery) => 
    api.get<ApiSuccessResponse<{
      items: AuditLog[];
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    }>>('/audit', query),

  /**
   * Get single audit log
   */
  getAuditLog: (id: string) => 
    api.get<ApiSuccessResponse<AuditLog>>(`/audit/${id}`),

  /**
   * Get audit statistics
   */
  getStats: (params?: { fromDate?: string; toDate?: string }) => 
    api.get<ApiSuccessResponse<{
      totalLogs: number;
      logsByAction: Array<{ action: string; count: number }>;
      logsByResource: Array<{ resourceType: string; count: number }>;
      logsByUser: Array<{ userId: string; userEmail: string; count: number }>;
      dailyActivity: Array<{ date: string; count: number }>;
    }>>('/audit/stats', params),

  /**
   * Export audit logs
   */
  exportLogs: (query: AuditQuery & { format?: 'csv' | 'json' }) => 
    api.get<Blob>('/audit/export', query),

  /**
   * Search audit logs
   */
  searchLogs: (params: {
    search?: string;
    fromDate?: string;
    toDate?: string;
    page?: number;
    limit?: number;
  }) => 
    api.get<ApiSuccessResponse<{
      items: AuditLog[];
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    }>>('/audit/search', params),

  /**
   * Get user activity summary
   */
  getUserActivity: (userId: string, params?: { days?: number }) => 
    api.get<ApiSuccessResponse<{
      userId: string;
      totalActions: number;
      actionsByType: Array<{ action: string; count: number }>;
      dailyActivity: Array<{ date: string; count: number }>;
      lastActivity: string;
    }>>(`/audit/users/${userId}/activity`, params),
};

import api from './client';
import type {
  ApiSuccessResponse,
  ReportSummary,
  PeakTimeData,
  StaffUtilization,
  ReportQuery,
  PaginationParams
} from '../types/api';

export const reportsApi = {
  /**
   * Get comprehensive report summary
   */
  getSummary: (query: ReportQuery) => 
    api.get<ApiSuccessResponse<ReportSummary>>('/reports/summary', query),

  /**
   * Get peak booking times analysis
   */
  getPeakTimes: (query: ReportQuery) => 
    api.get<ApiSuccessResponse<PeakTimeData[]>>('/reports/peak-times', query),

  /**
   * Get staff utilization report
   */
  getStaffUtilization: (query: ReportQuery) => 
    api.get<ApiSuccessResponse<StaffUtilization[]>>('/reports/staff-utilization', query),

  /**
   * Export data to CSV
   */
  exportData: (params: {
    type: 'appointments' | 'customers' | 'services' | 'staff';
    fromDate: string;
    toDate: string;
    format?: 'csv';
  }) => 
    api.get<Blob>('/reports/export', params),

  /**
   * Validate CSV export integrity
   */
  validateCsv: (data: {
    type: 'appointments' | 'customers' | 'services' | 'staff';
    csvData: string;
  }) => 
    api.post<ApiSuccessResponse<{
      isValid: boolean;
      recordCount: number;
      issues: Array<{
        row: number;
        field: string;
        message: string;
        severity: 'error' | 'warning';
      }>;
    }>>('/reports/validate-csv', data),

  /**
   * Test report performance
   */
  testPerformance: (params?: { testSize?: 'small' | 'medium' | 'large' }) => 
    api.post<ApiSuccessResponse<{
      testResults: {
        summaryTime: string;
        peakTimesTime: string;
        utilizationTime: string;
        exportTime: string;
      };
      meetsRequirements: {
        summaryPerformance: boolean;
        peakTimesPerformance: boolean;
        utilizationPerformance: boolean;
        exportPerformance: boolean;
      };
    }>>('/reports/test-performance', params),
};

import api from './client';
import type {
  ApiSuccessResponse,
  ArchivedAppointment,
  ArchiveQuery,
  ArchiveStats,
  PaginationParams
} from '../types/api';

export const archiveApi = {
  /**
   * Archive completed appointments
   */
  archiveAppointments: (data: { months: number }) => 
    api.post<ApiSuccessResponse<{
      archivedCount: number;
      totalProcessed: number;
      errors: Array<{
        appointmentId: string;
        error: string;
      }>;
      meetsRequirement: boolean;
      isNonBlocking: boolean;
    }>>('/archive/archive', data),

  /**
   * Search archived appointments
   */
  searchArchived: (query: ArchiveQuery) => 
    api.get<ApiSuccessResponse<{
      appointments: ArchivedAppointment[];
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    }>>('/archive/search', query),

  /**
   * Get archive statistics
   */
  getStats: () => 
    api.get<ApiSuccessResponse<ArchiveStats>>('/archive/stats'),

  /**
   * Restore archived appointment
   */
  restoreAppointment: (archivedId: string) => 
    api.post<ApiSuccessResponse<{
      success: boolean;
      appointmentId?: string;
      error?: string;
    }>>(`/archive/restore/${archivedId}`),

  /**
   * Test archival performance
   */
  testPerformance: (data: { testMonths: number }) => 
    api.post<ApiSuccessResponse<{
      testResults: {
        archiveTime: string;
        searchTime: string;
        statsTime: string;
        restoreTime: string;
      };
      meetsRequirements: {
        nonBlocking: boolean;
        noDataLoss: boolean;
        searchPerformance: boolean;
      };
    }>>('/archive/test-performance', data),

  /**
   * Get archive configuration
   */
  getConfiguration: () => 
    api.get<ApiSuccessResponse<{
      currentStats: ArchiveStats;
      configuration: {
        defaultArchiveMonths: number;
        maxArchiveMonths: number;
        batchSize: number;
        supportedOperations: string[];
      };
      recommendations: string[];
      features: {
        nonBlocking: boolean;
        searchable: boolean;
        restorable: boolean;
        noDataLoss: boolean;
      };
    }>>('/archive/configuration'),
};

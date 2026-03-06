import api from './client';
import type {
  ApiSuccessResponse,
  AISummary,
  GenerateAISummaryRequest,
  PaginationParams
} from '../types/api';

export const aiApi = {
  /**
   * Generate AI summary for appointment
   */
  generateSummary: (data: GenerateAISummaryRequest) => 
    api.post<ApiSuccessResponse<AISummary>>('/ai/summary', data),

  /**
   * Get AI summary for appointment
   */
  getSummary: (appointmentId: string) => 
    api.get<ApiSuccessResponse<AISummary>>(`/ai/summary/${appointmentId}`),

  /**
   * Update AI summary
   */
  updateSummary: (appointmentId: string, data: {
    summary?: string;
    keyPoints?: string[];
    actionItems?: string[];
  }) => 
    api.patch<ApiSuccessResponse<AISummary>>(`/ai/summary/${appointmentId}`, data),

  /**
   * Delete AI summary
   */
  deleteSummary: (appointmentId: string) => 
    api.delete<ApiSuccessResponse<{ success: boolean }>>(`/ai/summary/${appointmentId}`),

  /**
   * Get AI configuration
   */
  getConfiguration: () => 
    api.get<ApiSuccessResponse<{
      enabled: boolean;
      model: string;
      maxTokens: number;
      temperature: number;
      autoGenerate: boolean;
      supportedLanguages: string[];
    }>>('/ai/configuration'),

  /**
   * Update AI configuration
   */
  updateConfiguration: (data: {
    enabled?: boolean;
    model?: string;
    maxTokens?: number;
    temperature?: number;
    autoGenerate?: boolean;
  }) => 
    api.patch<ApiSuccessResponse<{
      enabled: boolean;
      model: string;
      maxTokens: number;
      temperature: number;
      autoGenerate: boolean;
    }>>('/ai/configuration', data),

  /**
   * Test AI functionality
   */
  testConfiguration: (testText?: string) => 
    api.post<ApiSuccessResponse<{
      success: boolean;
      response: string;
      latency: number;
      model: string;
      tokensUsed: number;
    }>>('/ai/test', { testText }),

  /**
   * Get AI usage statistics
   */
  getStats: (params?: { fromDate?: string; toDate?: string }) => 
    api.get<ApiSuccessResponse<{
      totalSummaries: number;
      averageTokensPerSummary: number;
      totalTokensUsed: number;
      summariesByDay: Array<{ date: string; count: number }>;
      averageLatency: number;
      successRate: number;
    }>>('/ai/stats', params),

  /**
   * Batch generate summaries
   */
  batchGenerate: (data: {
    appointmentIds: string[];
    includeKeyPoints?: boolean;
    includeActionItems?: boolean;
  }) => 
    api.post<ApiSuccessResponse<{
      processed: number;
      successful: number;
      failed: number;
      results: Array<{
        appointmentId: string;
        success: boolean;
        summary?: AISummary;
        error?: string;
      }>;
    }>>('/ai/batch-generate', data),
};

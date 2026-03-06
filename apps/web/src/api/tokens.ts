import api from './client';
import type {
  ApiSuccessResponse,
  ApiTokenResult,
  ApiTokenInfo,
  CreateApiTokenRequest,
  UpdateApiTokenRequest,
  TokenUsageStats,
  PaginationParams
} from '../types/api';

export const apiTokensApi = {
  /**
   * Create new API token
   */
  createToken: (data: CreateApiTokenRequest) => 
    api.post<ApiSuccessResponse<ApiTokenResult>>('/tokens', data),

  /**
   * List all API tokens
   */
  listTokens: () => 
    api.get<ApiSuccessResponse<ApiTokenInfo[]>>('/tokens'),

  /**
   * Get single token details
   */
  getToken: (id: string) => 
    api.get<ApiSuccessResponse<ApiTokenInfo>>(`/tokens/${id}`),

  /**
   * Update token
   */
  updateToken: (id: string, data: UpdateApiTokenRequest) => 
    api.put<ApiSuccessResponse<ApiTokenInfo>>(`/tokens/${id}`, data),

  /**
   * Revoke token
   */
  revokeToken: (id: string) => 
    api.delete<ApiSuccessResponse<{ success: boolean; id: string }>>(`/tokens/${id}`),

  /**
   * Get token usage statistics
   */
  getTokenUsage: (id: string, params?: { days?: number }) => 
    api.get<ApiSuccessResponse<TokenUsageStats>>(`/tokens/${id}/usage`, params),

  /**
   * Test token rate limiting
   */
  testRateLimit: (id: string) => 
    api.post<ApiSuccessResponse<{
      rateLimitReached: boolean;
      remainingRequests: number;
      resetTime: string;
    }>>(`/tokens/${id}/test-rate-limit`),

  /**
   * Clean up expired tokens
   */
  cleanupExpired: () => 
    api.post<ApiSuccessResponse<{ cleaned: number }>>('/tokens/cleanup-expired'),

  /**
   * Regenerate token (create new token, revoke old one)
   */
  regenerateToken: (id: string, data: { name: string }) => 
    api.post<ApiSuccessResponse<ApiTokenResult>>(`/tokens/${id}/regenerate`, data),
};

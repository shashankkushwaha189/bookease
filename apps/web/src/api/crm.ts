import api from './client';
import type { ApiSuccessResponse } from '../types/api';
import type { 
  CRMProvider, 
  CRMIntegration, 
  CRMSyncConfig,
  CRMFieldMapping 
} from '../utils/crm-integration';

export const crmApi = {
  /**
   * Get available CRM providers
   */
  getProviders: () => 
    api.get<ApiSuccessResponse<CRMProvider[]>>('/crm/providers'),

  /**
   * Get CRM integrations for current tenant
   */
  getIntegrations: () => 
    api.get<ApiSuccessResponse<CRMIntegration[]>>('/crm/integrations'),

  /**
   * Create new CRM integration
   */
  createIntegration: (data: {
    providerId: string;
    config: Record<string, any>;
    syncConfig: CRMSyncConfig;
  }) => 
    api.post<ApiSuccessResponse<CRMIntegration>>('/crm/integrations', data),

  /**
   * Update CRM integration
   */
  updateIntegration: (id: string, data: Partial<CRMIntegration>) => 
    api.put<ApiSuccessResponse<CRMIntegration>>(`/crm/integrations/${id}`, data),

  /**
   * Delete CRM integration
   */
  deleteIntegration: (id: string) => 
    api.delete<ApiSuccessResponse<void>>(`/crm/integrations/${id}`),

  /**
   * Test CRM connection
   */
  testConnection: (providerId: string, config: Record<string, any>) => 
    api.post<ApiSuccessResponse<{ success: boolean; message?: string }>>('/crm/test-connection', {
      providerId,
      config,
    }),

  /**
   * Get OAuth URL for CRM provider
   */
  getOAuthUrl: (providerId: string) => 
    api.get<ApiSuccessResponse<{ url: string; state: string }>>(`/crm/oauth/${providerId}/url`),

  /**
   * Complete OAuth flow
   */
  completeOAuth: (providerId: string, code: string, state: string) => 
    api.post<ApiSuccessResponse<{ accessToken: string; refreshToken: string }>>(`/crm/oauth/${providerId}/callback`, {
      code,
      state,
    }),

  /**
   * Sync data to CRM
   */
  syncToCRM: (integrationId: string, data: any) => 
    api.post<ApiSuccessResponse<{ success: boolean; crmId?: string; error?: string }>>(`/crm/integrations/${integrationId}/sync`, data),

  /**
   * Sync data from CRM
   */
  syncFromCRM: (integrationId: string) => 
    api.post<ApiSuccessResponse<{ synced: number; errors: string[] }>>(`/crm/integrations/${integrationId}/sync-from`),

  /**
   * Get sync status
   */
  getSyncStatus: (integrationId: string) => 
    api.get<ApiSuccessResponse<{
      lastSync: Date;
      syncStatus: string;
      errorCount: number;
      lastError?: string;
    }>>(`/crm/integrations/${integrationId}/sync-status`),

  /**
   * Get field mapping suggestions
   */
  getFieldMappingSuggestions: (providerId: string) => 
    api.get<ApiSuccessResponse<CRMFieldMapping[]>>(`/crm/providers/${providerId}/field-mappings`),

  /**
   * Update field mappings
   */
  updateFieldMappings: (integrationId: string, mappings: CRMFieldMapping[]) => 
    api.put<ApiSuccessResponse<CRMIntegration>>(`/crm/integrations/${integrationId}/field-mappings`, {
      mappings,
    }),

  /**
   * Get CRM data preview
   */
  getDataPreview: (integrationId: string, limit?: number) => 
    api.get<ApiSuccessResponse<{
      contacts: any[];
      total: number;
    }>>(`/crm/integrations/${integrationId}/preview?limit=${limit || 10}`),

  /**
   * Enable/disable integration
   */
  toggleIntegration: (integrationId: string, isActive: boolean) => 
    api.patch<ApiSuccessResponse<CRMIntegration>>(`/crm/integrations/${integrationId}/toggle`, {
      isActive,
    }),

  /**
   * Get integration logs
   */
  getIntegrationLogs: (integrationId: string, limit?: number) => 
    api.get<ApiSuccessResponse<{
      logs: Array<{
        id: string;
        timestamp: Date;
        level: 'info' | 'warn' | 'error';
        message: string;
        data?: any;
      }>;
      total: number;
    }>>(`/crm/integrations/${integrationId}/logs?limit=${limit || 50}`),

  /**
   * Export integration configuration
   */
  exportConfiguration: (integrationId: string) => 
    api.get<Blob>(`/crm/integrations/${integrationId}/export`, {
      responseType: 'blob',
    }),

  /**
   * Import integration configuration
   */
  importConfiguration: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post<ApiSuccessResponse<CRMIntegration>>('/crm/import-configuration', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  /**
   * Get CRM statistics
   */
  getStatistics: () => 
    api.get<ApiSuccessResponse<{
      totalIntegrations: number;
      activeIntegrations: number;
      totalSyncs: number;
      successfulSyncs: number;
      failedSyncs: number;
      lastSyncDate: Date;
      providerStats: Array<{
        providerId: string;
        providerName: string;
        integrationCount: number;
        syncCount: number;
        errorCount: number;
      }>;
    }>>('/crm/statistics'),

  /**
   * Bulk sync all active integrations
   */
  bulkSync: () => 
    api.post<ApiSuccessResponse<{
      triggered: number;
      errors: string[];
    }>>('/crm/bulk-sync'),

  /**
   * Get webhook status
   */
  getWebhookStatus: (integrationId: string) => 
    api.get<ApiSuccessResponse<{
      webhookUrl: string;
      isActive: boolean;
      lastTriggered?: Date;
      errorCount: number;
    }>>(`/crm/integrations/${integrationId}/webhook-status`),

  /**
   * Regenerate webhook URL
   */
  regenerateWebhook: (integrationId: string) => 
    api.post<ApiSuccessResponse<{ webhookUrl: string }>>(`/crm/integrations/${integrationId}/regenerate-webhook`),

  /**
   * Test webhook
   */
  testWebhook: (integrationId: string) => 
    api.post<ApiSuccessResponse<{ success: boolean; response?: any }>>(`/crm/integrations/${integrationId}/test-webhook`),

  /**
   * Get CRM-specific objects (for advanced integrations)
   */
  getCRMObjects: (integrationId: string) => 
    api.get<ApiSuccessResponse<{
      objects: Array<{
        name: string;
        label: string;
        fields: Array<{
          name: string;
          label: string;
          type: string;
          required: boolean;
        }>;
      }>;
    }>>(`/crm/integrations/${integrationId}/objects`),

  /**
   * Validate field mapping
   */
  validateFieldMapping: (integrationId: string, mapping: CRMFieldMapping) => 
    api.post<ApiSuccessResponse<{
      valid: boolean;
      errors: string[];
      sampleData?: any;
    }>>(`/crm/integrations/${integrationId}/validate-mapping`, mapping),
};

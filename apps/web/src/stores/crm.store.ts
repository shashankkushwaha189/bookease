import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CRMIntegration, CRMProvider, CRMSyncConfig } from '../utils/crm-integration';

interface CRMState {
  integrations: CRMIntegration[];
  providers: CRMProvider[];
  selectedIntegration: CRMIntegration | null;
  isLoading: boolean;
  isConnecting: boolean;
  connectionTest: Record<string, boolean>;
  syncStatus: Record<string, 'idle' | 'syncing' | 'success' | 'error'>;
  
  // Actions
  setIntegrations: (integrations: CRMIntegration[]) => void;
  setProviders: (providers: CRMProvider[]) => void;
  setSelectedIntegration: (integration: CRMIntegration | null) => void;
  addIntegration: (integration: CRMIntegration) => void;
  updateIntegration: (id: string, updates: Partial<CRMIntegration>) => void;
  removeIntegration: (id: string) => void;
  setLoading: (loading: boolean) => void;
  setConnecting: (connecting: boolean) => void;
  setConnectionTest: (integrationId: string, result: boolean) => void;
  setSyncStatus: (integrationId: string, status: 'idle' | 'syncing' | 'success' | 'error') => void;
  
  // Computed
  getActiveIntegrations: () => CRMIntegration[];
  getIntegrationById: (id: string) => CRMIntegration | undefined;
  getIntegrationByProvider: (providerId: string) => CRMIntegration | undefined;
  hasActiveIntegration: (providerId: string) => boolean;
}

export const useCRMStore = create<CRMState>()(
  persist(
    (set, get) => ({
      integrations: [],
      providers: [],
      selectedIntegration: null,
      isLoading: false,
      isConnecting: false,
      connectionTest: {},
      syncStatus: {},

      setIntegrations: (integrations) => set({ integrations }),

      setProviders: (providers) => set({ providers }),

      setSelectedIntegration: (selectedIntegration) => set({ selectedIntegration }),

      addIntegration: (integration) => set((state) => ({
        integrations: [...state.integrations, integration]
      })),

      updateIntegration: (id, updates) => set((state) => ({
        integrations: state.integrations.map(integration =>
          integration.id === id ? { ...integration, ...updates } : integration
        ),
        selectedIntegration: state.selectedIntegration?.id === id
          ? { ...state.selectedIntegration, ...updates }
          : state.selectedIntegration
      })),

      removeIntegration: (id) => set((state) => ({
        integrations: state.integrations.filter(integration => integration.id !== id),
        selectedIntegration: state.selectedIntegration?.id === id ? null : state.selectedIntegration
      })),

      setLoading: (isLoading) => set({ isLoading }),

      setConnecting: (isConnecting) => set({ isConnecting }),

      setConnectionTest: (integrationId, result) => set((state) => ({
        connectionTest: { ...state.connectionTest, [integrationId]: result }
      })),

      setSyncStatus: (integrationId, status) => set((state) => ({
        syncStatus: { ...state.syncStatus, [integrationId]: status }
      })),

      // Computed getters
      getActiveIntegrations: () => {
        return get().integrations.filter(integration => integration.isActive);
      },

      getIntegrationById: (id) => {
        return get().integrations.find(integration => integration.id === id);
      },

      getIntegrationByProvider: (providerId) => {
        return get().integrations.find(integration => integration.providerId === providerId);
      },

      hasActiveIntegration: (providerId) => {
        const integration = get().getIntegrationByProvider(providerId);
        return integration?.isActive || false;
      },
    }),
    {
      name: 'crm-store',
      partialize: (state) => ({
        integrations: state.integrations,
        providers: state.providers,
      }),
    }
  )
);

// CRM Store hooks for common operations
export const useCRMActions = () => {
  const store = useCRMStore();
  
  const testConnection = async (integrationId: string) => {
    store.setConnectionTest(integrationId, false);
    
    try {
      // This would call the actual API
      // const result = await crmApi.testConnection(integration.providerId, integration.config);
      // store.setConnectionTest(integrationId, result.success);
      
      // Mock implementation
      await new Promise(resolve => setTimeout(resolve, 2000));
      store.setConnectionTest(integrationId, Math.random() > 0.3);
      
      return store.connectionTest[integrationId];
    } catch (error) {
      store.setConnectionTest(integrationId, false);
      return false;
    }
  };

  const syncIntegration = async (integrationId: string) => {
    store.setSyncStatus(integrationId, 'syncing');
    
    try {
      // This would call the actual API
      // await crmApi.syncToCRM(integrationId, data);
      
      // Mock implementation
      await new Promise(resolve => setTimeout(resolve, 3000));
      store.setSyncStatus(integrationId, Math.random() > 0.2 ? 'success' : 'error');
      
      return store.syncStatus[integrationId];
    } catch (error) {
      store.setSyncStatus(integrationId, 'error');
      return 'error';
    }
  };

  const toggleIntegration = async (integrationId: string) => {
    const integration = store.getIntegrationById(integrationId);
    if (!integration) return;

    try {
      // This would call the actual API
      // await crmApi.toggleIntegration(integrationId, !integration.isActive);
      
      // Update local state
      store.updateIntegration(integrationId, { isActive: !integration.isActive });
    } catch (error) {
      console.error('Failed to toggle integration:', error);
    }
  };

  const deleteIntegration = async (integrationId: string) => {
    try {
      // This would call the actual API
      // await crmApi.deleteIntegration(integrationId);
      
      // Update local state
      store.removeIntegration(integrationId);
    } catch (error) {
      console.error('Failed to delete integration:', error);
    }
  };

  return {
    testConnection,
    syncIntegration,
    toggleIntegration,
    deleteIntegration,
  };
};

// CRM Store selectors
export const useCRMSelectors = () => {
  const store = useCRMStore();
  
  return {
    totalIntegrations: store.integrations.length,
    activeIntegrations: store.getActiveIntegrations().length,
    connectedIntegrations: store.integrations.filter(i => i.syncStatus === 'connected').length,
    errorIntegrations: store.integrations.filter(i => i.syncStatus === 'error').length,
    syncingIntegrations: store.integrations.filter(i => i.syncStatus === 'syncing').length,
    
    getProviderStats: () => {
      const stats: Record<string, { count: number; active: number }> = {};
      
      store.integrations.forEach(integration => {
        if (!stats[integration.providerId]) {
          stats[integration.providerId] = { count: 0, active: 0 };
        }
        stats[integration.providerId].count++;
        if (integration.isActive) {
          stats[integration.providerId].active++;
        }
      });
      
      return stats;
    },
  };
};

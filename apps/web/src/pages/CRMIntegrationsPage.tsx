import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Plus, 
  Settings, 
  RefreshCw, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  ExternalLink,
  Trash2,
  Edit,
  Eye,
  Download,
  Upload
} from 'lucide-react';
import { useToastStore } from '../stores/toast.store';
import { crmApi } from '../api/crm';
import { crmProviders, crmUtils } from '../utils/crm-integration';
import type { CRMIntegration, CRMProvider } from '../utils/crm-integration';
import Button from '../components/ui/Button';

const CRMIntegrationsPage: React.FC = () => {
  const navigate = useNavigate();
  const toastStore = useToastStore();
  
  const [integrations, setIntegrations] = useState<CRMIntegration[]>([]);
  const [providers, setProviders] = useState<CRMProvider[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedIntegration, setSelectedIntegration] = useState<CRMIntegration | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [testingConnection, setTestingConnection] = useState<string | null>(null);

  useEffect(() => {
    loadIntegrations();
    loadProviders();
  }, []);

  const loadIntegrations = async () => {
    try {
      const response = await crmApi.getIntegrations();
      setIntegrations(response.data.data);
    } catch (error) {
      console.error('Failed to load integrations:', error);
      toastStore.error('Failed to load CRM integrations');
    } finally {
      setIsLoading(false);
    }
  };

  const loadProviders = async () => {
    try {
      const response = await crmApi.getProviders();
      setProviders(response.data.data);
    } catch (error) {
      console.error('Failed to load providers:', error);
      // Use local providers as fallback
      setProviders(crmProviders);
    }
  };

  const handleTestConnection = async (integration: CRMIntegration) => {
    setTestingConnection(integration.id);
    try {
      const response = await crmApi.testConnection(integration.providerId, integration.config);
      if (response.data.data.success) {
        toastStore.success('Connection test successful');
      } else {
        toastStore.error(response.data.data.message || 'Connection test failed');
      }
    } catch (error) {
      console.error('Connection test failed:', error);
      toastStore.error('Connection test failed');
    } finally {
      setTestingConnection(null);
    }
  };

  const handleToggleIntegration = async (integration: CRMIntegration) => {
    try {
      await crmApi.toggleIntegration(integration.id, !integration.isActive);
      await loadIntegrations();
      toastStore.success(`Integration ${integration.isActive ? 'disabled' : 'enabled'}`);
    } catch (error) {
      console.error('Failed to toggle integration:', error);
      toastStore.error('Failed to toggle integration');
    }
  };

  const handleDeleteIntegration = async (integration: CRMIntegration) => {
    if (!confirm(`Are you sure you want to delete the ${integration.providerId} integration?`)) {
      return;
    }

    try {
      await crmApi.deleteIntegration(integration.id);
      await loadIntegrations();
      toastStore.success('Integration deleted successfully');
    } catch (error) {
      console.error('Failed to delete integration:', error);
      toastStore.error('Failed to delete integration');
    }
  };

  const handleSyncToCRM = async (integration: CRMIntegration) => {
    try {
      const response = await crmApi.syncToCRM(integration.id, { test: true });
      if (response.data.data.success) {
        toastStore.success('Test sync completed successfully');
      } else {
        toastStore.error(response.data.data.error || 'Sync failed');
      }
    } catch (error) {
      console.error('Sync failed:', error);
      toastStore.error('Sync failed');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'disconnected':
        return <XCircle className="w-4 h-4 text-red-600" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-yellow-600" />;
      case 'syncing':
        return <RefreshCw className="w-4 h-4 text-blue-600 animate-spin" />;
      default:
        return <AlertCircle className="w-4 h-4 text-neutral-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected':
        return 'bg-green-100 text-green-700';
      case 'disconnected':
        return 'bg-red-100 text-red-700';
      case 'error':
        return 'bg-yellow-100 text-yellow-700';
      case 'syncing':
        return 'bg-blue-100 text-blue-700';
      default:
        return 'bg-neutral-100 text-neutral-700';
    }
  };

  const getProviderInfo = (providerId: string) => {
    return providers.find(p => p.id === providerId) || crmUtils.getProviderById(providerId);
  };

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Header */}
      <div className="bg-white border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <button
                onClick={() => navigate('/admin/settings')}
                className="flex items-center text-neutral-600 hover:text-neutral-900 transition-colors"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Settings
              </button>
            </div>
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-neutral-900">CRM Integrations</h1>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Overview */}
        <div className="bg-white rounded-lg border border-neutral-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-neutral-900 mb-1">CRM Integration Overview</h2>
              <p className="text-sm text-neutral-600">
                Connect your BookEase account with popular CRM platforms
              </p>
            </div>
            <Button
              onClick={() => setShowAddModal(true)}
              size="sm"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Integration
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-neutral-50 rounded-lg p-4">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                  <Settings className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-neutral-900">{integrations.length}</p>
                  <p className="text-sm text-neutral-600">Total Integrations</p>
                </div>
              </div>
            </div>
            
            <div className="bg-neutral-50 rounded-lg p-4">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-neutral-900">
                    {integrations.filter(i => i.isActive).length}
                  </p>
                  <p className="text-sm text-neutral-600">Active</p>
                </div>
              </div>
            </div>
            
            <div className="bg-neutral-50 rounded-lg p-4">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center mr-3">
                  <AlertCircle className="w-5 h-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-neutral-900">
                    {integrations.filter(i => i.syncStatus === 'error').length}
                  </p>
                  <p className="text-sm text-neutral-600">Errors</p>
                </div>
              </div>
            </div>
            
            <div className="bg-neutral-50 rounded-lg p-4">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
                  <RefreshCw className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-neutral-900">
                    {integrations.filter(i => i.syncStatus === 'syncing').length}
                  </p>
                  <p className="text-sm text-neutral-600">Syncing</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Integrations List */}
        <div className="bg-white rounded-lg border border-neutral-200">
          <div className="p-6 border-b border-neutral-200">
            <h3 className="text-lg font-semibold text-neutral-900">Active Integrations</h3>
          </div>

          {isLoading ? (
            <div className="p-12 text-center">
              <RefreshCw className="w-8 h-8 text-neutral-400 animate-spin mx-auto mb-4" />
              <p className="text-neutral-600">Loading integrations...</p>
            </div>
          ) : integrations.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Settings className="w-8 h-8 text-neutral-400" />
              </div>
              <h4 className="text-lg font-semibold text-neutral-900 mb-2">No CRM Integrations</h4>
              <p className="text-neutral-600 mb-4">
                Connect your CRM platforms to sync customer data and appointments
              </p>
              <Button onClick={() => setShowAddModal(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Your First Integration
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-neutral-200">
              {integrations.map((integration) => {
                const provider = getProviderInfo(integration.providerId);
                return (
                  <div key={integration.id} className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-neutral-100 rounded-lg flex items-center justify-center">
                          {provider?.logo ? (
                            <img src={provider.logo} alt={provider.name} className="w-8 h-8" />
                          ) : (
                            <Settings className="w-6 h-6 text-neutral-400" />
                          )}
                        </div>
                        <div>
                          <h4 className="font-semibold text-neutral-900">{provider?.name || integration.providerId}</h4>
                          <p className="text-sm text-neutral-600">{provider?.description}</p>
                          <div className="flex items-center space-x-2 mt-1">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(integration.syncStatus)}`}>
                              {getStatusIcon(integration.syncStatus)}
                              <span className="ml-1">{integration.syncStatus}</span>
                            </span>
                            {integration.lastSync && (
                              <span className="text-xs text-neutral-500">
                                Last sync: {new Date(integration.lastSync).toLocaleString()}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          onClick={() => handleTestConnection(integration)}
                          disabled={testingConnection === integration.id}
                          loading={testingConnection === integration.id}
                          size="sm"
                        >
                          Test Connection
                        </Button>
                        
                        <Button
                          variant="outline"
                          onClick={() => handleSyncToCRM(integration)}
                          size="sm"
                        >
                          <RefreshCw className="w-4 h-4 mr-2" />
                          Sync
                        </Button>
                        
                        <Button
                          variant="outline"
                          onClick={() => handleToggleIntegration(integration)}
                          size="sm"
                        >
                          {integration.isActive ? 'Disable' : 'Enable'}
                        </Button>
                        
                        <div className="relative group">
                          <Button variant="outline" size="sm">
                            <Settings className="w-4 h-4" />
                          </Button>
                          <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-neutral-200 py-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                            <button
                              className="w-full px-4 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-50 flex items-center"
                              onClick={() => setSelectedIntegration(integration)}
                            >
                              <Eye className="w-4 h-4 mr-2" />
                              View Details
                            </button>
                            <button
                              className="w-full px-4 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-50 flex items-center"
                              onClick={() => {/* TODO: Edit integration */}}
                            >
                              <Edit className="w-4 h-4 mr-2" />
                              Edit
                            </button>
                            <button
                              className="w-full px-4 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-50 flex items-center"
                              onClick={() => {/* TODO: Export config */}}
                            >
                              <Download className="w-4 h-4 mr-2" />
                              Export
                            </button>
                            <button
                              className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center"
                              onClick={() => handleDeleteIntegration(integration)}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {integration.errorMessage && (
                      <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <div className="flex items-center">
                          <AlertCircle className="w-4 h-4 text-red-600 mr-2" />
                          <p className="text-sm text-red-800">{integration.errorMessage}</p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Available Providers */}
        <div className="mt-6 bg-white rounded-lg border border-neutral-200 p-6">
          <h3 className="text-lg font-semibold text-neutral-900 mb-4">Available CRM Providers</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {providers.map((provider) => (
              <div key={provider.id} className="border border-neutral-200 rounded-lg p-4 hover:border-neutral-300 transition-colors">
                <div className="flex items-center space-x-3 mb-2">
                  <div className="w-10 h-10 bg-neutral-100 rounded-lg flex items-center justify-center">
                    {provider.logo ? (
                      <img src={provider.logo} alt={provider.name} className="w-6 h-6" />
                    ) : (
                      <Settings className="w-5 h-5 text-neutral-400" />
                    )}
                  </div>
                  <div>
                    <h4 className="font-medium text-neutral-900">{provider.name}</h4>
                    <p className="text-xs text-neutral-600">{provider.category}</p>
                  </div>
                </div>
                <p className="text-sm text-neutral-600 mb-3">{provider.description}</p>
                <div className="flex flex-wrap gap-1">
                  {provider.features.slice(0, 2).map((feature, index) => (
                    <span key={index} className="px-2 py-1 bg-neutral-100 text-neutral-700 text-xs rounded-full">
                      {feature}
                    </span>
                  ))}
                  {provider.features.length > 2 && (
                    <span className="px-2 py-1 bg-neutral-100 text-neutral-700 text-xs rounded-full">
                      +{provider.features.length - 2}
                    </span>
                  )}
                </div>
                <Button
                  variant="outline"
                  onClick={() => setShowAddModal(true)}
                  className="w-full mt-3"
                  size="sm"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Connect
                </Button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Add Integration Modal - Placeholder */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-neutral-900 mb-4">Add CRM Integration</h3>
            <p className="text-neutral-600 mb-4">
              CRM integration setup will be available in the next update. For now, please contact support to set up your CRM integration.
            </p>
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => setShowAddModal(false)}
              >
                Cancel
              </Button>
              <Button onClick={() => setShowAddModal(false)}>
                Got it
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CRMIntegrationsPage;

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Settings, 
  Clock, 
  Calendar, 
  Users, 
  Brain, 
  Scales, 
  Repeat, 
  AlertTriangle, 
  Check, 
  X, 
  History,
  Info,
  RotateCcw
} from 'lucide-react';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { useToastStore } from '../../stores/toast.store';

// Types
interface ConfigData {
  booking: {
    maxBookingsPerDay: number;
    slotLockDuration: number;
    allowGuestBooking: boolean;
  };
  cancellation: {
    cancellationWindowHours: number;
    maxReschedulesAllowed: number;
    noShowGracePeriodMinutes: number;
  };
  features: {
    aiSummaries: boolean;
    loadBalancing: boolean;
    recurringAppointments: boolean;
  };
  staffPermissions: {
    staffCanCancel: boolean;
    staffCanReschedule: boolean;
  };
}

interface ConfigVersion {
  id: string;
  version: number;
  data: ConfigData;
  savedBy: string;
  savedAt: string;
  note: string;
}

interface ConfigChange {
  field: string;
  oldValue: any;
  newValue: any;
  path: string[];
}

// API Hooks (mock implementations - replace with actual API calls)
const useConfig = () => {
  const [config, setConfig] = React.useState<ConfigData | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        // Mock API call - replace with actual API
        await new Promise(resolve => setTimeout(resolve, 600));
        
        const mockConfig: ConfigData = {
          booking: {
            maxBookingsPerDay: 50,
            slotLockDuration: 15,
            allowGuestBooking: true,
          },
          cancellation: {
            cancellationWindowHours: 24,
            maxReschedulesAllowed: 3,
            noShowGracePeriodMinutes: 15,
          },
          features: {
            aiSummaries: true,
            loadBalancing: false,
            recurringAppointments: true,
          },
          staffPermissions: {
            staffCanCancel: true,
            staffCanReschedule: true,
          },
        };
        
        setConfig(mockConfig);
      } catch (error) {
        console.error('Failed to fetch config:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchConfig();
  }, []);

  const saveConfig = async (data: ConfigData, note: string) => {
    try {
      // Mock API call - replace with actual API
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setConfig(data);
      return true;
    } catch (error) {
      console.error('Failed to save config:', error);
      return false;
    }
  };

  return { config, isLoading, saveConfig };
};

const useConfigVersions = () => {
  const [versions, setVersions] = React.useState<ConfigVersion[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  useEffect(() => {
    const fetchVersions = async () => {
      try {
        // Mock API call - replace with actual API
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const mockVersions: ConfigVersion[] = [
          {
            id: 'v1',
            version: 1,
            data: {
              booking: { maxBookingsPerDay: 30, slotLockDuration: 10, allowGuestBooking: false },
              cancellation: { cancellationWindowHours: 12, maxReschedulesAllowed: 2, noShowGracePeriodMinutes: 10 },
              features: { aiSummaries: false, loadBalancing: false, recurringAppointments: false },
              staffPermissions: { staffCanCancel: false, staffCanReschedule: false },
            },
            savedBy: 'Admin User',
            savedAt: '2024-03-01T10:00:00',
            note: 'Initial configuration'
          },
          {
            id: 'v2',
            version: 2,
            data: {
              booking: { maxBookingsPerDay: 50, slotLockDuration: 15, allowGuestBooking: true },
              cancellation: { cancellationWindowHours: 24, maxReschedulesAllowed: 3, noShowGracePeriodMinutes: 15 },
              features: { aiSummaries: true, loadBalancing: false, recurringAppointments: true },
              staffPermissions: { staffCanCancel: true, staffCanReschedule: true },
            },
            savedBy: 'Admin User',
            savedAt: '2024-03-02T14:30:00',
            note: 'Added AI summaries and guest booking'
          },
        ];
        
        setVersions(mockVersions);
      } catch (error) {
        console.error('Failed to fetch versions:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchVersions();
  }, []);

  const rollbackToVersion = async (versionId: string) => {
    try {
      // Mock API call - replace with actual API
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const version = versions.find(v => v.id === versionId);
      if (version) {
        return version.data;
      }
      return null;
    } catch (error) {
      console.error('Failed to rollback:', error);
      return null;
    }
  };

  return { versions, isLoading, rollbackToVersion };
};

// Components
const TabButton: React.FC<{
  label: string;
  icon: React.ReactNode;
  isActive: boolean;
  onClick: () => void;
}> = ({ label, icon, isActive, onClick }) => {
  return (
    <button
      onClick={onClick}
      className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors ${
        isActive
          ? 'bg-primary text-primary-soft'
          : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
};

const FieldWithHighlight: React.FC<{
  label: string;
  value: any;
  onChange: (value: any) => void;
  type?: 'text' | 'number';
  min?: number;
  max?: number;
  hasChanges?: boolean;
  warning?: string;
  description?: string;
}> = ({ label, value, onChange, type = 'text', min, max, hasChanges, warning, description }) => {
  return (
    <div className={`space-y-2 p-4 rounded-lg border ${hasChanges ? 'border-warning bg-warning-soft' : 'border-neutral-200 bg-surface'}`}>
      <div>
        <label className="block text-sm font-medium text-neutral-900">{label}</label>
        {description && (
          <p className="text-xs text-neutral-600 mt-1">{description}</p>
        )}
      </div>
      
      <Input
        type={type}
        value={value}
        onChange={(e) => onChange(type === 'number' ? Number(e.target.value) : e.target.value)}
        min={min}
        max={max}
      />
      
      {warning && (
        <div className="flex items-start space-x-2 text-amber-600 text-sm">
          <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{warning}</span>
        </div>
      )}
      
      {hasChanges && (
        <div className="text-xs text-warning font-medium">Unsaved changes</div>
      )}
    </div>
  );
};

const ToggleFieldWithHighlight: React.FC<{
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
  hasChanges?: boolean;
  description?: string;
  tooltip?: string;
}> = ({ label, value, onChange, hasChanges, description, tooltip }) => {
  return (
    <div className={`space-y-2 p-4 rounded-lg border ${hasChanges ? 'border-warning bg-warning-soft' : 'border-neutral-200 bg-surface'}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <label className="block text-sm font-medium text-neutral-900">{label}</label>
          {description && (
            <p className="text-xs text-neutral-600 mt-1">{description}</p>
          )}
        </div>
        
        {tooltip && (
          <div className="group relative">
            <Info className="w-4 h-4 text-neutral-400 cursor-help" />
            <div className="absolute right-0 bottom-full mb-2 w-64 p-2 bg-neutral-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              {tooltip}
            </div>
          </div>
        )}
      </div>
      
      <button
        onClick={() => onChange(!value)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          value ? 'bg-success' : 'bg-neutral-300'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            value ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
      
      {hasChanges && (
        <div className="text-xs text-warning font-medium">Unsaved changes</div>
      )}
    </div>
  );
};

const VersionHistoryItem: React.FC<{
  version: ConfigVersion;
  onRollback: () => void;
}> = ({ version, onRollback }) => {
  return (
    <div className="p-4 border border-neutral-200 rounded-lg hover:bg-neutral-50">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-2">
            <span className="font-medium text-neutral-900">Version {version.version}</span>
            <span className="text-xs text-neutral-500">by {version.savedBy}</span>
          </div>
          <div className="text-sm text-neutral-600 mt-1">
            {new Date(version.savedAt).toLocaleString()}
          </div>
          {version.note && (
            <div className="text-xs text-neutral-500 mt-1 italic">{version.note}</div>
          )}
        </div>
        
        <Button variant="ghost" size="sm" onClick={onRollback}>
          <RotateCcw className="w-4 h-4 mr-1" />
          Rollback
        </Button>
      </div>
    </div>
  );
};

const DiffPreview: React.FC<{
  beforeValue: any;
  afterValue: any;
  fieldName: string;
}> = ({ beforeValue, afterValue, fieldName }) => {
  return (
    <div className="space-y-2">
      <h4 className="font-medium text-neutral-900">{fieldName}</h4>
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <div className="text-xs text-danger font-medium mb-1">Before:</div>
          <div className="p-2 bg-danger-soft border border-danger rounded text-danger">
            {JSON.stringify(beforeValue)}
          </div>
        </div>
        <div>
          <div className="text-xs text-success font-medium mb-1">After:</div>
          <div className="p-2 bg-success-soft border border-success rounded text-success">
            {JSON.stringify(afterValue)}
          </div>
        </div>
      </div>
    </div>
  );
};

// Main Component
const ConfigPage: React.FC = () => {
  const { success, error } = useToastStore();
  const { config, isLoading, saveConfig } = useConfig();
  const { versions, rollbackToVersion } = useConfigVersions();
  
  const [activeTab, setActiveTab] = React.useState<'booking' | 'cancellation' | 'features' | 'permissions'>('booking');
  const [currentConfig, setCurrentConfig] = React.useState<ConfigData | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = React.useState(false);
  const [saveNote, setSaveNote] = React.useState('');
  const [showSaveDialog, setShowSaveDialog] = React.useState(false);
  const [showRollbackDialog, setShowRollbackDialog] = React.useState(false);
  const [rollbackVersion, setRollbackVersion] = React.useState<ConfigVersion | null>(null);
  const [rollbackDiff, setRollbackDiff] = React.useState<ConfigChange[]>([]);

  // Initialize current config when loaded
  useEffect(() => {
    if (config && !currentConfig) {
      setCurrentConfig(JSON.parse(JSON.stringify(config)));
    }
  }, [config, currentConfig]);

  // Check for unsaved changes
  useEffect(() => {
    if (currentConfig && config) {
      const hasChanges = JSON.stringify(currentConfig) !== JSON.stringify(config);
      setHasUnsavedChanges(hasChanges);
    }
  }, [currentConfig, config]);

  // Update config value
  const updateConfigValue = (path: string[], value: any) => {
    if (!currentConfig) return;

    const newConfig = { ...currentConfig };
    let current: any = newConfig;
    
    for (let i = 0; i < path.length - 1; i++) {
      current = current[path[i]];
    }
    
    current[path[path.length - 1]] = value;
    setCurrentConfig(newConfig);
  };

  // Handle save
  const handleSave = async () => {
    if (!currentConfig) return;

    const success = await saveConfig(currentConfig, saveNote);
    if (success) {
      success('Configuration saved successfully');
      setShowSaveDialog(false);
      setSaveNote('');
      setHasUnsavedChanges(false);
    } else {
      error('Failed to save configuration');
    }
  };

  // Handle rollback
  const handleRollback = async () => {
    if (!rollbackVersion) return;

    const rolledBackConfig = await rollbackToVersion(rollbackVersion.id);
    if (rolledBackConfig) {
      setCurrentConfig(rolledBackConfig);
      setShowRollbackDialog(false);
      setRollbackVersion(null);
      success('Configuration rolled back successfully');
    } else {
      error('Failed to rollback configuration');
    }
  };

  // Calculate diff for rollback
  const calculateDiff = useCallback((before: ConfigData, after: ConfigData) => {
    const changes: ConfigChange[] = [];
    
    const compareObjects = (obj1: any, obj2: any, path: string[] = []) => {
      Object.keys(obj2).forEach(key => {
        const currentPath = [...path, key];
        const beforeValue = obj1[key];
        const afterValue = obj2[key];
        
        if (JSON.stringify(beforeValue) !== JSON.stringify(afterValue)) {
          changes.push({
            field: currentPath.join('.'),
            oldValue: beforeValue,
            newValue: afterValue,
            path: currentPath
          });
        }
      });
    };
    
    compareObjects(before, after);
    return changes;
  }, []);

  // Prepare rollback dialog
  const prepareRollback = (version: ConfigVersion) => {
    setRollbackVersion(version);
    if (config) {
      const diff = calculateDiff(config, version.data);
      setRollbackDiff(diff);
    }
    setShowRollbackDialog(true);
  };

  // Handle discard changes
  const handleDiscard = () => {
    if (config) {
      setCurrentConfig(JSON.parse(JSON.stringify(config)));
      setHasUnsavedChanges(false);
    }
  };

  if (isLoading || !currentConfig) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Configuration</h1>
          <p className="text-neutral-600">Manage system settings and policies</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-neutral-200">
        <nav className="flex space-x-8">
          <TabButton
            label="Booking"
            icon={<Calendar className="w-4 h-4" />}
            isActive={activeTab === 'booking'}
            onClick={() => setActiveTab('booking')}
          />
          <TabButton
            label="Cancellation & No-Show"
            icon={<Clock className="w-4 h-4" />}
            isActive={activeTab === 'cancellation'}
            onClick={() => setActiveTab('cancellation')}
          />
          <TabButton
            label="Features"
            icon={<Settings className="w-4 h-4" />}
            isActive={activeTab === 'features'}
            onClick={() => setActiveTab('features')}
          />
          <TabButton
            label="Staff Permissions"
            icon={<Users className="w-4 h-4" />}
            isActive={activeTab === 'permissions'}
            onClick={() => setActiveTab('permissions')}
          />
        </nav>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Configuration Form */}
        <div className="lg:col-span-2 space-y-6">
          {activeTab === 'booking' && (
            <>
              <FieldWithHighlight
                label="Max bookings per day"
                value={currentConfig.booking.maxBookingsPerDay}
                onChange={(value) => updateConfigValue(['booking', 'maxBookingsPerDay'], value)}
                type="number"
                min={1}
                max={500}
                hasChanges={config.booking.maxBookingsPerDay !== currentConfig.booking.maxBookingsPerDay}
                description="Maximum number of appointments that can be booked per day"
              />
              
              <FieldWithHighlight
                label="Slot lock duration in minutes"
                value={currentConfig.booking.slotLockDuration}
                onChange={(value) => updateConfigValue(['booking', 'slotLockDuration'], value)}
                type="number"
                min={5}
                max={60}
                hasChanges={config.booking.slotLockDuration !== currentConfig.booking.slotLockDuration}
                description="How long a time slot is held when a customer starts booking"
              />
              
              <ToggleFieldWithHighlight
                label="Allow guest booking"
                value={currentConfig.booking.allowGuestBooking}
                onChange={(value) => updateConfigValue(['booking', 'allowGuestBooking'], value)}
                hasChanges={config.booking.allowGuestBooking !== currentConfig.booking.allowGuestBooking}
                description="Allow customers to book without creating an account"
              />
            </>
          )}

          {activeTab === 'cancellation' && (
            <>
              <FieldWithHighlight
                label="Cancellation allowed until X hours before"
                value={currentConfig.cancellation.cancellationWindowHours}
                onChange={(value) => updateConfigValue(['cancellation', 'cancellationWindowHours'], value)}
                type="number"
                min={0}
                max={168}
                hasChanges={config.cancellation.cancellationWindowHours !== currentConfig.cancellation.cancellationWindowHours}
                warning={currentConfig.cancellation.cancellationWindowHours === 0 ? 
                  "Setting to 0 means customers can cancel at any time, even seconds before." : undefined}
              />
              <div className="text-sm text-neutral-600 bg-neutral-50 p-3 rounded-lg">
                Customers can cancel up to {currentConfig.cancellation.cancellationWindowHours} hours before their appointment
              </div>
              
              <FieldWithHighlight
                label="Max reschedules allowed"
                value={currentConfig.cancellation.maxReschedulesAllowed}
                onChange={(value) => updateConfigValue(['cancellation', 'maxReschedulesAllowed'], value)}
                type="number"
                min={0}
                max={10}
                hasChanges={config.cancellation.maxReschedulesAllowed !== currentConfig.cancellation.maxReschedulesAllowed}
                description="0 = no rescheduling allowed"
              />
              
              <FieldWithHighlight
                label="No-show grace period in minutes"
                value={currentConfig.cancellation.noShowGracePeriodMinutes}
                onChange={(value) => updateConfigValue(['cancellation', 'noShowGracePeriodMinutes'], value)}
                type="number"
                min={0}
                max={60}
                hasChanges={config.cancellation.noShowGracePeriodMinutes !== currentConfig.cancellation.noShowGracePeriodMinutes}
                description="Mark as no-show if customer doesn't arrive within this time"
              />
              <div className="text-sm text-neutral-600 bg-neutral-50 p-3 rounded-lg">
                Mark as no-show if customer doesn't arrive within {currentConfig.cancellation.noShowGracePeriodMinutes} minutes
              </div>
            </>
          )}

          {activeTab === 'features' && (
            <>
              <ToggleFieldWithHighlight
                label="AI summaries"
                value={currentConfig.features.aiSummaries}
                onChange={(value) => updateConfigValue(['features', 'aiSummaries'], value)}
                hasChanges={config.features.aiSummaries !== currentConfig.features.aiSummaries}
                description="Allows staff to generate AI-powered summaries after appointments"
                tooltip="This feature uses AI to automatically generate appointment summaries based on notes and outcomes"
              />
              
              <ToggleFieldWithHighlight
                label="Load balancing"
                value={currentConfig.features.loadBalancing}
                onChange={(value) => updateConfigValue(['features', 'loadBalancing'], value)}
                hasChanges={config.features.loadBalancing !== currentConfig.features.loadBalancing}
                description="Auto-assign appointments evenly across available staff"
              />
              
              <ToggleFieldWithHighlight
                label="Recurring appointments"
                value={currentConfig.features.recurringAppointments}
                onChange={(value) => updateConfigValue(['features', 'recurringAppointments'], value)}
                hasChanges={config.features.recurringAppointments !== currentConfig.features.recurringAppointments}
                description="Allow customers to book recurring appointments"
              />
            </>
          )}

          {activeTab === 'permissions' && (
            <>
              <ToggleFieldWithHighlight
                label="Staff can cancel appointments"
                value={currentConfig.staffPermissions.staffCanCancel}
                onChange={(value) => updateConfigValue(['staffPermissions', 'staffCanCancel'], value)}
                hasChanges={config.staffPermissions.staffCanCancel !== currentConfig.staffPermissions.staffCanCancel}
                description="Allow staff members to cancel appointments"
              />
              
              <ToggleFieldWithHighlight
                label="Staff can reschedule appointments"
                value={currentConfig.staffPermissions.staffCanReschedule}
                onChange={(value) => updateConfigValue(['staffPermissions', 'staffCanReschedule'], value)}
                hasChanges={config.staffPermissions.staffCanReschedule !== currentConfig.staffPermissions.staffCanReschedule}
                description="Allow staff members to reschedule appointments"
              />
            </>
          )}
        </div>

        {/* Version History Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-surface border border-neutral-200 rounded-lg p-6 sticky top-6">
            <div className="flex items-center space-x-2 mb-4">
              <History className="w-5 h-5 text-neutral-600" />
              <h3 className="text-lg font-semibold text-neutral-900">Version History</h3>
            </div>
            
            <div className="space-y-3">
              {versions.map((version) => (
                <VersionHistoryItem
                  key={version.id}
                  version={version}
                  onRollback={() => prepareRollback(version)}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Unsaved Changes Banner */}
      {hasUnsavedChanges && (
        <div className="fixed bottom-0 left-0 right-0 bg-warning-soft border border-warning p-4">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5 text-warning" />
              <span className="font-medium text-warning">You have unsaved changes</span>
            </div>
            <div className="flex items-center space-x-3">
              <Button variant="secondary" onClick={handleDiscard}>
                Discard
              </Button>
              <Button variant="primary" onClick={() => setShowSaveDialog(true)}>
                Save Changes
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Save Dialog */}
      <ConfirmDialog
        isOpen={showSaveDialog}
        onClose={() => setShowSaveDialog(false)}
        title="Save Configuration"
        confirmText="Save Changes"
        onConfirm={handleSave}
      >
        <div className="space-y-4">
          <p className="text-neutral-600">Please describe what changes you made:</p>
          <textarea
            value={saveNote}
            onChange={(e) => setSaveNote(e.target.value)}
            className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
            rows={3}
            placeholder="e.g., Increased booking limit, enabled AI summaries..."
          />
        </div>
      </ConfirmDialog>

      {/* Rollback Dialog */}
      <ConfirmDialog
        isOpen={showRollbackDialog}
        onClose={() => {
          setShowRollbackDialog(false);
          setRollbackVersion(null);
          setRollbackDiff([]);
        }}
        title="Rollback Configuration"
        confirmText="Rollback"
        onConfirm={handleRollback}
        variant="warning"
      >
        <div className="space-y-4">
          <p className="text-neutral-600">
            Are you sure you want to rollback to version {rollbackVersion?.version}?
            This will replace all current settings with the previous version.
          </p>
          
          {rollbackDiff.length > 0 && (
            <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-4 max-h-60 overflow-y-auto">
              <h4 className="font-medium text-neutral-900 mb-3">Changes that will be made:</h4>
              <div className="space-y-3">
                {rollbackDiff.map((change, index) => (
                  <DiffPreview
                    key={index}
                    beforeValue={change.oldValue}
                    afterValue={change.newValue}
                    fieldName={change.field}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </ConfirmDialog>
    </div>
  );
};

export default ConfigPage;

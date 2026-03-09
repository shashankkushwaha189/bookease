import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/EnhancedAuthContext';
import { Monitor, Smartphone, MapPin, Clock, ShieldAlert, LogOut, Settings, Eye, EyeOff } from 'lucide-react';

interface Session {
  id: string;
  device: {
    name: string;
    type: 'mobile' | 'desktop' | 'tablet';
    trusted: boolean;
  };
  ipAddress: string;
  userAgent: string;
  lastAccessAt: string;
  expiresAt: string;
  isActive: boolean;
  location?: {
    city: string;
    country: string;
  };
}

interface Device {
  id: string;
  name: string;
  type: 'mobile' | 'desktop' | 'tablet';
  trusted: boolean;
  lastSeen: string;
  platform?: string;
  browser?: string;
}

interface SecurityAlert {
  id: string;
  type: 'suspicious_login' | 'new_device' | 'mfa_disabled' | 'account_locked';
  message: string;
  timestamp: string;
  acknowledged: boolean;
  severity: 'low' | 'medium' | 'high';
}

export const SessionDashboard: React.FC = () => {
  const { user, sessions, devices, revokeSession, updateDeviceTrust } = useAuth();
  const [activeTab, setActiveTab] = useState<'sessions' | 'devices' | 'alerts'>('sessions');
  const [showSessionDetails, setShowSessionDetails] = useState<Session | null>(null);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [showDeviceModal, setShowDeviceModal] = useState(false);
  const [alertFilter, setAlertFilter] = useState<'all' | 'unacknowledged' | 'high' | 'medium' | 'low'>('all');

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const formatDuration = (lastAccess: string) => {
    const now = new Date();
    const last = new Date(lastAccess);
    const diff = now.getTime() - last.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    
    if (days > 0) {
      return `${days}d ${hours % 24}h ago`;
    } else if (hours > 0) {
      return `${hours}h ago`;
    } else {
      return 'Just now';
    }
  };

  const revokeSessionHandler = async (sessionId: string) => {
    try {
      await revokeSession(sessionId);
      setShowSessionDetails(null);
    } catch (error) {
      console.error('Failed to revoke session:', error);
    }
  };

  const updateDeviceTrustHandler = async (deviceId: string, trusted: boolean) => {
    try {
      await updateDeviceTrust(deviceId, trusted);
      setSelectedDevice(null);
      setShowDeviceModal(false);
    } catch (error) {
      console.error('Failed to update device trust:', error);
    }
  };

  const acknowledgeAlert = async (alertId: string) => {
    // This would call the API to acknowledge the alert
    console.log('Acknowledging alert:', alertId);
  };

  const filteredSessions = sessions?.filter(session => session.isActive) || [];
  const filteredDevices = devices?.filter(device => device.trusted) || [];
  const filteredAlerts = devices?.filter(() => true) || [];

  const getDeviceIcon = (type: string) => {
    switch (type) {
      case 'mobile':
        return <Smartphone className="w-5 h-5" />;
      case 'desktop':
        return <Monitor className="w-5 h-5" />;
      case 'tablet':
        return <Monitor className="w-5 h-5" />;
      default:
        return <Monitor className="w-5 h-5" />;
    }
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'suspicious_login':
        return <ShieldAlert className="w-5 h-5 text-red-500" />;
      case 'new_device':
        return <Smartphone className="w-5 h-5 text-yellow-500" />;
      case 'mfa_disabled':
        return <ShieldAlert className="w-5 h-5 text-orange-500" />;
      case 'account_locked':
        return <ShieldAlert className="w-5 h-5 text-red-600" />;
      default:
        return <ShieldAlert className="w-5 h-5 text-gray-500" />;
    }
  };

  const getAlertColor = (type: string) => {
    switch (type) {
      case 'suspicious_login':
        return 'text-red-500';
      case 'new_device':
        return 'text-yellow-500';
      case 'mfa_disabled':
        return 'text-orange-500';
      case 'account_locked':
        return 'text-red-600';
      default:
        return 'text-gray-500';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
        <div className="bg-white shadow sm:rounded-lg sm:overflow-hidden">
          <div className="px-4 py-8 sm:px-10">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Security Dashboard
              </h1>
              <p className="text-gray-600 mb-6">
                Monitor your account security and manage active sessions
              </p>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8">
                <button
                  onClick={() => setActiveTab('sessions')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'sessions'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Active Sessions
                </button>
                <button
                  onClick={() => setActiveTab('devices')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'devices'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Trusted Devices
                </button>
                <button
                  onClick={() => setActiveTab('alerts')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'alerts'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Security Alerts
                </button>
              </nav>
            </div>

            {/* Tab Content */}
            {activeTab === 'sessions' && (
              <div className="space-y-6">
                {/* Sessions List */}
                <div className="bg-white rounded-lg border border-gray-200">
                  <div className="px-6 py-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900">
                        Active Sessions
                      </h3>
                      <span className="text-sm text-gray-500">
                        {filteredSessions.length} active sessions
                      </span>
                    </div>
                    <button
                      onClick={() => setShowSessionDetails(null)}
                      className="text-sm text-blue-600 hover:text-blue-500"
                    >
                      Clear Filters
                    </button>
                  </div>

                  <div className="space-y-3">
                    {filteredSessions.map((session) => (
                      <div
                        key={session.id}
                        className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                        onClick={() => setShowSessionDetails(session)}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-3">
                            <div className="flex items-center">
                              {getDeviceIcon(session.device.type)}
                              <span className="ml-2 text-sm text-gray-600">
                                {session.device.name}
                              </span>
                              <span className="ml-2 px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">
                                {session.device.trusted ? 'Trusted' : 'Unknown'}
                              </span>
                            </div>
                            <div className="text-sm text-gray-500">
                              {session.location?.city && `${session.location.city}, ${session.location.country}`}
                            </div>
                          </div>
                          <div className="text-sm text-gray-500">
                            Last active: {formatDateTime(session.lastAccessAt)}
                          </div>
                          <div className="text-sm text-gray-500">
                            Duration: {formatDuration(session.lastAccessAt)}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => revokeSessionHandler(session.id)}
                            className="text-red-600 hover:text-red-700 text-sm"
                          >
                            <LogOut className="w-4 h-4" />
                            Revoke
                          </button>
                          <button
                            onClick={() => setShowSessionDetails(session)}
                            className="text-blue-600 hover:text-blue-700 text-sm"
                          >
                            <Eye className="w-4 h-4" />
                            Details
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {activeTab === 'devices' && (
              <div className="space-y-6">
                <div className="bg-white rounded-lg border border-gray-200">
                  <div className="px-6 py-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900">
                        Trusted Devices
                      </h3>
                      <button
                        onClick={() => setShowDeviceModal(true)}
                        className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        Add Device
                      </button>
                    </div>

                    <div className="space-y-3">
                      {filteredDevices.map((device) => (
                        <div
                          key={device.id}
                          className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center space-x-3">
                              {getDeviceIcon(device.type)}
                              <span className="ml-2 text-sm text-gray-600">
                                {device.name}
                              </span>
                              <span className="ml-2 px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">
                                {device.trusted ? 'Trusted' : 'Untrusted'}
                              </span>
                            </div>
                            <div className="text-sm text-gray-500">
                              Last seen: {formatDateTime(device.lastSeen)}
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => updateDeviceTrustHandler(device.id, !device.trusted)}
                              className="text-green-600 hover:text-green-700 text-sm"
                            >
                              {device.trusted ? 'Untrust' : 'Trust'}
                            </button>
                            <button
                              onClick={() => setSelectedDevice(device)}
                              className="text-blue-600 hover:text-blue-700 text-sm"
                            >
                              <Settings className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}

            {activeTab === 'alerts' && (
              <div className="space-y-6">
                {/* Alert Filters */}
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">
                      Security Alerts
                    </h3>
                    <div className="flex items-center space-x-2">
                      <select
                        value={alertFilter}
                        onChange={(e) => setAlertFilter(e.target.value as any)}
                        className="rounded-md border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="all">All Alerts</option>
                        <option value="unacknowledged">Unacknowledged</option>
                        <option value="high">High Priority</option>
                        <option value="medium">Medium Priority</option>
                        <option value="low">Low Priority</option>
                      </select>
                      <button
                        onClick={() => setAlertFilter('all')}
                        className="text-sm text-blue-600 hover:text-blue-500"
                      >
                        Clear
                      </button>
                    </div>
                  </div>

                  {/* Alerts List */}
                  <div className="space-y-3">
                    {filteredAlerts.map((alert) => (
                      <div
                        key={alert.id}
                        className={`border rounded-lg p-4 ${
                          alert.acknowledged ? 'border-gray-200 bg-gray-50' : 'border-yellow-200 bg-yellow-50'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <div className={`p-2 rounded-full ${getAlertColor(alert.type)} bg-opacity-10`}>
                              {getAlertIcon(alert.type)}
                            </div>
                            <div>
                              <h4 className="font-semibold text-gray-900">
                                {alert.type.replace('_', ' ').replace(/\b\w/g, ' ')}
                              </h4>
                              <p className="text-sm text-gray-600 mt-1">
                                {formatDateTime(alert.timestamp)}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            {!alert.acknowledged && (
                              <button
                                onClick={() => acknowledgeAlert(alert.id)}
                                className="text-blue-600 hover:text-blue-700 text-sm"
                              >
                                Acknowledge
                              </button>
                            )}
                          </div>
                        </div>
                        <div className="mt-3">
                          <p className="text-sm text-gray-700">
                            {alert.message}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Session Details Modal */}
      {showSessionDetails && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="flex items-center justify-center min-h-full p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Session Details
                </h3>
                <button
                  onClick={() => setShowSessionDetails(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <span className="sr-only">Close</span>
                  ×
                </button>
              </div>

              {showSessionDetails && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-medium text-gray-900">Device Information</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Device Type:</span>
                          <span className="font-medium">{showSessionDetails.device.type}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Device Name:</span>
                          <span className="font-medium">{showSessionDetails.device.name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Trusted:</span>
                          <span className={`font-medium ${showSessionDetails.device.trusted ? 'text-green-600' : 'text-red-600'}`}>
                            {showSessionDetails.device.trusted ? 'Yes' : 'No'}
                          </span>
                        </div>
                        {showSessionDetails.location && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Location:</span>
                            <span className="font-medium">
                              {showSessionDetails.location.city}, {showSessionDetails.location.country}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-900">Session Information</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">IP Address:</span>
                          <span className="font-medium">{showSessionDetails.ipAddress}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">User Agent:</span>
                          <span className="font-medium truncate max-w-xs">
                            {showSessionDetails.userAgent}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Last Access:</span>
                          <span className="font-medium">{formatDateTime(showSessionDetails.lastAccessAt)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Expires:</span>
                          <span className="font-medium">{formatDateTime(showSessionDetails.expiresAt)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Duration:</span>
                          <span className="font-medium">{formatDuration(showSessionDetails.lastAccessAt)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Device Trust Modal */}
      {showDeviceModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="flex items-center justify-center min-h-full p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  {selectedDevice?.trusted ? 'Untrust Device' : 'Trust Device'}
                </h3>
              </div>

              {selectedDevice && (
                <div className="space-y-4">
                  <div className="text-center mb-4">
                    {getDeviceIcon(selectedDevice.type)}
                    <div className="mt-2">
                      <h4 className="font-medium">{selectedDevice.name}</h4>
                      <p className="text-sm text-gray-600">
                        {selectedDevice.platform} • {selectedDevice.browser}
                      </p>
                    </div>
                  </div>
                  
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <p className="text-sm text-yellow-800 mb-4">
                      {selectedDevice?.trusted 
                        ? 'Untrusting this device will require you to authenticate again on your next login.'
                        : 'Trusting this device will allow it to bypass additional security verification on future logins.'
                      }
                    </p>
                    
                    <div className="flex space-x-4">
                      <button
                        onClick={() => setShowDeviceModal(false)}
                        className="flex-1 bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => updateDeviceTrustHandler(selectedDevice.id, !selectedDevice.trusted)}
                        className="flex-1 bg-yellow-600 text-white py-2 px-4 rounded-md hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                      >
                        {selectedDevice?.trusted ? 'Untrust' : 'Trust'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

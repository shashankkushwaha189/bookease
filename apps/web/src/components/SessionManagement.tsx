import React, { useState, useEffect } from 'react';
import { Monitor, Smartphone, Globe, Clock, Shield, LogOut, RefreshCw, AlertTriangle } from 'lucide-react';
import { useSessionStore } from '../stores/session.store';
import { useAuthStore } from '../stores/auth.store';
import { useToastStore } from '../stores/toast.store';
import Button from '../components/ui/Button';

const SessionManagement: React.FC = () => {
  const { 
    sessions, 
    currentSession, 
    isLoading, 
    refreshSessions, 
    revokeSession, 
    revokeAllOtherSessions, 
    extendSession 
  } = useSessionStore();
  const { user } = useAuthStore();
  const toastStore = useToastStore();
  
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [isRevoking, setIsRevoking] = useState<string | null>(null);
  const [isExtending, setIsExtending] = useState<string | null>(null);

  useEffect(() => {
    refreshSessions();
  }, [refreshSessions]);

  const getDeviceIcon = (userAgent: string) => {
    if (userAgent.includes('Mobile') || userAgent.includes('Android') || userAgent.includes('iPhone')) {
      return <Smartphone className="w-5 h-5" />;
    }
    return <Monitor className="w-5 h-5" />;
  };

  const getDeviceName = (userAgent: string) => {
    if (userAgent.includes('Chrome')) return 'Chrome';
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Safari')) return 'Safari';
    if (userAgent.includes('Edge')) return 'Edge';
    return 'Unknown Browser';
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  };

  const isSessionExpired = (expiresAt: string) => {
    return new Date() > new Date(expiresAt);
  };

  const handleRevokeSession = async (sessionId: string) => {
    if (sessionId === currentSession?.id) {
      toastStore.error('You cannot revoke your current session');
      return;
    }

    setIsRevoking(sessionId);
    try {
      await revokeSession(sessionId);
      toastStore.success('Session revoked successfully');
    } catch (error: any) {
      console.error('Failed to revoke session:', error);
      toastStore.error('Failed to revoke session');
    } finally {
      setIsRevoking(null);
      setSelectedSession(null);
    }
  };

  const handleRevokeAllOther = async () => {
    const otherSessionsCount = sessions.filter(s => s.id !== currentSession?.id).length;
    if (otherSessionsCount === 0) {
      toastStore.info('No other active sessions');
      return;
    }

    setIsRevoking('all');
    try {
      await revokeAllOtherSessions();
      toastStore.success(`Revoked ${otherSessionsCount} other session${otherSessionsCount > 1 ? 's' : ''}`);
    } catch (error: any) {
      console.error('Failed to revoke other sessions:', error);
      toastStore.error('Failed to revoke other sessions');
    } finally {
      setIsRevoking(null);
    }
  };

  const handleExtendSession = async (sessionId: string) => {
    setIsExtending(sessionId);
    try {
      await extendSession(sessionId);
      toastStore.success('Session extended by 24 hours');
    } catch (error: any) {
      console.error('Failed to extend session:', error);
      toastStore.error('Failed to extend session');
    } finally {
      setIsExtending(null);
    }
  };

  const activeSessions = sessions.filter(session => !isSessionExpired(session.expiresAt));
  const expiredSessions = sessions.filter(session => isSessionExpired(session.expiresAt));
  const otherSessions = activeSessions.filter(s => s.id !== currentSession?.id);

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg border border-neutral-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-neutral-900 mb-1">Active Sessions</h3>
            <p className="text-sm text-neutral-600">
              Manage your active login sessions across devices
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <Button
              variant="outline"
              onClick={refreshSessions}
              disabled={isLoading}
              loading={isLoading}
              size="sm"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            {otherSessions.length > 0 && (
              <Button
                variant="outline"
                onClick={handleRevokeAllOther}
                disabled={isRevoking === 'all'}
                loading={isRevoking === 'all'}
                size="sm"
                className="text-error-600 border-error-200 hover:bg-error-50"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Revoke All Others
              </Button>
            )}
          </div>
        </div>

        {/* Session Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-neutral-50 rounded-lg p-4">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-success-100 rounded-lg flex items-center justify-center mr-3">
                <Shield className="w-5 h-5 text-success-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-neutral-900">{activeSessions.length}</p>
                <p className="text-sm text-neutral-600">Active Sessions</p>
              </div>
            </div>
          </div>
          
          <div className="bg-neutral-50 rounded-lg p-4">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-warning-100 rounded-lg flex items-center justify-center mr-3">
                <AlertTriangle className="w-5 h-5 text-warning-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-neutral-900">{expiredSessions.length}</p>
                <p className="text-sm text-neutral-600">Expired Sessions</p>
              </div>
            </div>
          </div>
          
          <div className="bg-neutral-50 rounded-lg p-4">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-brand-100 rounded-lg flex items-center justify-center mr-3">
                <Monitor className="w-5 h-5 text-brand-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-neutral-900">{otherSessions.length}</p>
                <p className="text-sm text-neutral-600">Other Devices</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Current Session */}
      {currentSession && (
        <div className="bg-white rounded-lg border border-neutral-200 p-6">
          <div className="flex items-center mb-4">
            <div className="w-8 h-8 bg-success-100 rounded-lg flex items-center justify-center mr-3">
              <Shield className="w-4 h-4 text-success-600" />
            </div>
            <h4 className="text-lg font-semibold text-neutral-900">Current Session</h4>
            <span className="ml-3 px-2 py-1 bg-success-100 text-success-700 text-xs font-medium rounded-full">
              Active Now
            </span>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between py-3 border-b border-neutral-100">
              <div className="flex items-center">
                {getDeviceIcon(currentSession.userAgent)}
                <div className="ml-3">
                  <p className="font-medium text-neutral-900">{getDeviceName(currentSession.userAgent)}</p>
                  <p className="text-sm text-neutral-500">{currentSession.ip}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-neutral-600">Last activity</p>
                <p className="text-xs text-neutral-500">{getTimeAgo(currentSession.lastActivity)}</p>
              </div>
            </div>
            
            <div className="flex items-center justify-between py-3">
              <div className="flex items-center text-sm text-neutral-600">
                <Clock className="w-4 h-4 mr-2" />
                Expires {formatTime(currentSession.expiresAt)}
              </div>
              <Button
                variant="outline"
                onClick={() => handleExtendSession(currentSession.id)}
                disabled={isExtending === currentSession.id}
                loading={isExtending === currentSession.id}
                size="sm"
              >
                Extend Session
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Other Sessions */}
      {otherSessions.length > 0 && (
        <div className="bg-white rounded-lg border border-neutral-200 p-6">
          <h4 className="text-lg font-semibold text-neutral-900 mb-4">Other Active Sessions</h4>
          
          <div className="space-y-3">
            {otherSessions.map((session) => (
              <div
                key={session.id}
                className={`border rounded-lg p-4 transition-colors ${
                  selectedSession === session.id
                    ? 'border-brand-500 bg-brand-50'
                    : 'border-neutral-200 hover:border-neutral-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={selectedSession === session.id}
                      onChange={(e) => setSelectedSession(e.target.checked ? session.id : null)}
                      className="w-4 h-4 text-brand-600 border-neutral-300 rounded focus:ring-brand-500 mr-3"
                    />
                    {getDeviceIcon(session.userAgent)}
                    <div className="ml-3">
                      <p className="font-medium text-neutral-900">
                        {getDeviceName(session.userAgent)}
                      </p>
                      <div className="flex items-center text-sm text-neutral-500">
                        <Globe className="w-3 h-3 mr-1" />
                        {session.ip}
                        <span className="mx-2">•</span>
                        <Clock className="w-3 h-3 mr-1" />
                        {getTimeAgo(session.lastActivity)}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      onClick={() => handleExtendSession(session.id)}
                      disabled={isExtending === session.id}
                      loading={isExtending === session.id}
                      size="sm"
                    >
                      Extend
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleRevokeSession(session.id)}
                      disabled={isRevoking === session.id}
                      loading={isRevoking === session.id}
                      size="sm"
                      className="text-error-600 border-error-200 hover:bg-error-50"
                    >
                      <LogOut className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No Sessions */}
      {sessions.length === 0 && !isLoading && (
        <div className="bg-white rounded-lg border border-neutral-200 p-12 text-center">
          <div className="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Monitor className="w-8 h-8 text-neutral-400" />
          </div>
          <h4 className="text-lg font-semibold text-neutral-900 mb-2">No Active Sessions</h4>
          <p className="text-neutral-600">
            You don't have any active sessions. This might be a display issue.
          </p>
        </div>
      )}
    </div>
  );
};

export default SessionManagement;

import React, { createContext, useContext, useReducer, ReactNode, useEffect } from 'react';
import { User, UserRole } from '@prisma/client';

export interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isLoading: boolean;
  mfaRequired: boolean;
  sessions: Session[];
  devices: Device[];
  securityAlerts: SecurityAlert[];
}

export interface AuthContextType extends AuthState {
  login: (email: string, password: string, tenantSlug?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: (refreshToken: string) => Promise<void>;
  updateProfile: (userData: Partial<User>) => Promise<void>;
  enableMFA: () => Promise<void>;
  disableMFA: () => Promise<void>;
  generateRecoveryCodes: () => Promise<string[]>;
  revokeSession: (sessionId: string) => Promise<void>;
  updateDeviceTrust: (deviceId: string, trusted: boolean) => Promise<void>;
}

export interface Session {
  id: string;
  token: string;
  device: DeviceInfo;
  ipAddress: string;
  userAgent: string;
  lastAccessAt: Date;
  expiresAt: Date;
  isActive: boolean;
}

export interface DeviceInfo {
  id: string;
  name: string;
  type: 'mobile' | 'desktop' | 'tablet';
  trusted: boolean;
  lastSeen: Date;
}

export interface SecurityAlert {
  id: string;
  type: 'suspicious_login' | 'new_device' | 'mfa_disabled' | 'account_locked';
  message: string;
  timestamp: Date;
  acknowledged: boolean;
}

const initialState: AuthState = {
  user: null,
  token: null,
  refreshToken: null,
  isLoading: false,
  mfaRequired: false,
  sessions: [],
  devices: [],
  securityAlerts: [],
};

type AuthAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_USER'; payload: User }
  | { type: 'SET_TOKEN'; payload: string }
  | { type: 'SET_REFRESH_TOKEN'; payload: string }
  | { type: 'SET_MFA_REQUIRED'; payload: boolean }
  | { type: 'SET_SESSIONS'; payload: Session[] }
  | { type: 'SET_DEVICES'; payload: Device[] }
  | { type: 'SET_SECURITY_ALERTS'; payload: SecurityAlert[] }
  | { type: 'ADD_SESSION'; payload: Session }
  | { type: 'REMOVE_SESSION'; payload: string }
  | { type: 'ADD_DEVICE'; payload: DeviceInfo }
  | { type: 'UPDATE_DEVICE_TRUST'; payload: { deviceId: string; trusted: boolean } }
  | { type: 'ADD_SECURITY_ALERT'; payload: SecurityAlert }
  | { type: 'ACKNOWLEDGE_ALERT'; payload: string };

const authReducer = (state: AuthState, action: AuthAction): AuthState => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    
    case 'SET_USER':
      return { ...state, user: action.payload, isLoading: false };
    
    case 'SET_TOKEN':
      return { ...state, token: action.payload };
    
    case 'SET_REFRESH_TOKEN':
      return { ...state, refreshToken: action.payload };
    
    case 'SET_MFA_REQUIRED':
      return { ...state, mfaRequired: action.payload };
    
    case 'SET_SESSIONS':
      return { ...state, sessions: action.payload };
    
    case 'SET_DEVICES':
      return { ...state, devices: action.payload };
    
    case 'SET_SECURITY_ALERTS':
      return { ...state, securityAlerts: action.payload };
    
    case 'ADD_SESSION':
      return { ...state, sessions: [...state.sessions, action.payload] };
    
    case 'REMOVE_SESSION':
      return { 
        ...state, 
        sessions: state.sessions.filter(s => s.id !== action.payload)
      };
    
    case 'ADD_DEVICE':
      return { ...state, devices: [...state.devices, action.payload] };
    
    case 'UPDATE_DEVICE_TRUST':
      return {
        ...state,
        devices: state.devices.map(device => 
          device.id === action.payload.deviceId 
            ? { ...device, trusted: action.payload.trusted }
            : device
        )
      };
    
    case 'ADD_SECURITY_ALERT':
      return { ...state, securityAlerts: [action.payload, ...state.securityAlerts] };
    
    case 'ACKNOWLEDGE_ALERT':
      return {
        ...state,
        securityAlerts: state.securityAlerts.map(alert =>
          alert.id === action.payload ? { ...alert, acknowledged: true } : alert
        )
      };
    
    default:
      return state;
  }
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Auto-refresh token
  useEffect(() => {
    const interval = setInterval(async () => {
      if (state.refreshToken) {
        try {
          const response = await fetch('/api/auth/refresh', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${state.refreshToken}`,
            },
            body: JSON.stringify({ refreshToken: state.refreshToken }),
          });

          if (response.ok) {
            const data = await response.json();
            dispatch({ type: 'SET_TOKEN', payload: data.token });
            dispatch({ type: 'SET_REFRESH_TOKEN', payload: data.refreshToken });
          }
        } catch (error) {
          console.error('Token refresh failed:', error);
        }
      }
    }, 14 * 60 * 1000); // Refresh every 14 minutes

    return () => clearInterval(interval);
  }, [state.refreshToken]);

  // Fetch user sessions and devices
  useEffect(() => {
    const fetchUserData = async () => {
      if (state.token) {
        try {
          const [sessionsResponse, devicesResponse] = await Promise.all([
            fetch('/api/sessions/user', {
              headers: { 'Authorization': `Bearer ${state.token}` },
            }),
            fetch('/api/sessions/user/devices', {
              headers: { 'Authorization': `Bearer ${state.token}` },
            }),
          ]);

          if (sessionsResponse.ok && devicesResponse.ok) {
            const sessions = await sessionsResponse.json();
            const devices = await devicesResponse.json();
            
            dispatch({ type: 'SET_SESSIONS', payload: sessions.sessions });
            dispatch({ type: 'SET_DEVICES', payload: devices.devices });
          }
        } catch (error) {
          console.error('Failed to fetch user data:', error);
        }
      }
    };

    fetchUserData();
    const interval = setInterval(fetchUserData, 30 * 1000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [state.token]);

  const value: AuthContextType = {
    ...state,
    login: async (email, password, tenantSlug) => {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      try {
        const response = await fetch('/api/users/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, tenantSlug }),
        });

        if (response.ok) {
          const data = await response.json();
          
          if (data.data.mfaRequired) {
            dispatch({ type: 'SET_MFA_REQUIRED', payload: true });
            return;
          }

          dispatch({ type: 'SET_USER', payload: data.data.user });
          dispatch({ type: 'SET_TOKEN', payload: data.data.token });
          dispatch({ type: 'SET_REFRESH_TOKEN', payload: data.data.refreshToken });
        } else {
          throw new Error(data.error?.message || 'Login failed');
        }
      } catch (error) {
        dispatch({ type: 'SET_LOADING', payload: false });
        throw error;
      }
    },
    logout: async () => {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      try {
        await fetch('/api/users/logout', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${state.token}` },
        });
        
        dispatch({ type: 'SET_USER', payload: null });
        dispatch({ type: 'SET_TOKEN', payload: null });
        dispatch({ type: 'SET_REFRESH_TOKEN', payload: null });
        dispatch({ type: 'SET_SESSIONS', payload: [] });
        dispatch({ type: 'SET_DEVICES', payload: [] });
      } catch (error) {
        console.error('Logout failed:', error);
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    },
    refreshToken: async (refreshToken) => {
      try {
        const response = await fetch('/api/users/refresh', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });

        if (response.ok) {
          const data = await response.json();
          dispatch({ type: 'SET_TOKEN', payload: data.token });
          dispatch({ type: 'SET_REFRESH_TOKEN', payload: data.refreshToken });
        }
      } catch (error) {
        throw new Error('Token refresh failed');
      }
    },
    updateProfile: async (userData) => {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      try {
        const response = await fetch('/api/users/profile', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${state.token}`,
          },
          body: JSON.stringify(userData),
        });

        if (response.ok) {
          const data = await response.json();
          dispatch({ type: 'SET_USER', payload: data.data });
        }
      } catch (error) {
        dispatch({ type: 'SET_LOADING', payload: false });
        throw error;
      }
    },
    enableMFA: async () => {
      try {
        const response = await fetch('/api/mfa/enable', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${state.token}`,
          },
          body: JSON.stringify({ userId: state.user?.id }),
        });

        if (response.ok) {
          dispatch({ type: 'SET_MFA_REQUIRED', payload: false });
        }
      } catch (error) {
        throw new Error('MFA enable failed');
      }
    },
    disableMFA: async () => {
      try {
        const response = await fetch('/api/mfa/disable', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${state.token}`,
          },
          body: JSON.stringify({ userId: state.user?.id }),
        });

        if (response.ok) {
          dispatch({ type: 'SET_MFA_REQUIRED', payload: true });
        }
      } catch (error) {
        throw new Error('MFA disable failed');
      }
    },
    generateRecoveryCodes: async () => {
      try {
        const response = await fetch('/api/mfa/recovery/generate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${state.token}`,
          },
          body: JSON.stringify({ userId: state.user?.id }),
        });

        if (response.ok) {
          const data = await response.json();
          return data.data.codes;
        }
      } catch (error) {
        throw new Error('Recovery codes generation failed');
      }
    },
    revokeSession: async (sessionId) => {
      try {
        const response = await fetch(`/api/sessions/${sessionId}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${state.token}` },
        });

        if (response.ok) {
          dispatch({ type: 'REMOVE_SESSION', payload: sessionId });
        }
      } catch (error) {
        throw new Error('Session revocation failed');
      }
    },
    updateDeviceTrust: async (deviceId, trusted) => {
      try {
        const response = await fetch('/api/sessions/device/trust', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${state.token}`,
          },
          body: JSON.stringify({ deviceId, trusted }),
        });

        if (response.ok) {
          dispatch({ type: 'UPDATE_DEVICE_TRUST', payload: { deviceId, trusted } });
        }
      } catch (error) {
        throw new Error('Device trust update failed');
      }
    },
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
